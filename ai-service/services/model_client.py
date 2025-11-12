"""
Model Client Abstraction

Provides unified interface for different AI model providers:
- Hugging Face (local models - primary, privacy-first)
- Hugging Face API (£9 fallback for less powerful hardware)
- OpenAI (optional, for users who prefer it)

Author: Justice Companion Team
License: MIT
"""

import os
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx


class ModelClient(ABC):
    """
    Abstract base class for AI model clients.

    All model clients must implement the generate() method which takes
    a prompt and returns generated text.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize model client with configuration.

        Args:
            config: Configuration dictionary (model name, temperature, etc.)
        """
        self.config = config

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text response from prompt.

        Args:
            prompt: User prompt
            system_prompt: Optional system instructions

        Returns:
            Generated text response

        Raises:
            Exception: If generation fails
        """
        pass

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the model client.

        Returns:
            Dictionary with provider, model name, etc.
        """
        return {
            "provider": self.__class__.__name__,
            "model": self.config.get("model", "unknown"),
        }


class HuggingFaceLocalClient(ModelClient):
    """
    Hugging Face local model client (PRIMARY - privacy-first).

    Loads and runs models locally using transformers library.
    Best for privacy and no API costs.

    Recommended models for legal document analysis:
    - google/flan-t5-large (instruction-following, 780M params)
    - mistralai/Mistral-7B-Instruct-v0.1 (reasoning, 7B params)
    - nlpaueb/legal-bert-base-uncased (legal-specific, 110M params)
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize local Hugging Face client.

        Args:
            config: Must include:
                - model: Model name/path (e.g., "google/flan-t5-large")
                - device: "cuda" or "cpu" (default: "cpu")
                - max_length: Max tokens to generate (default: 2000)
                - temperature: Sampling temperature (default: 0.7)
        """
        super().__init__(config)
        self.model = None
        self.tokenizer = None
        self.device = config.get("device", "cpu")
        self.max_length = config.get("max_length", 2000)
        self.temperature = config.get("temperature", 0.7)

    async def _load_model(self):
        """Lazy-load model and tokenizer on first use"""
        if self.model is not None:
            return

        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            import torch

            model_name = self.config.get("model", "google/flan-t5-large")
            print(f"[HuggingFaceLocal] Loading model: {model_name}")

            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                low_cpu_mem_usage=True
            )
            self.model.to(self.device)
            self.model.eval()

            print(f"[HuggingFaceLocal] Model loaded successfully on {self.device}")

        except ImportError:
            raise RuntimeError(
                "transformers and torch not installed. "
                "Install with: pip install transformers torch"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to load Hugging Face model: {e}")

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text using local Hugging Face model.

        Args:
            prompt: User prompt
            system_prompt: Optional system instructions (prepended to prompt)

        Returns:
            Generated text
        """
        await self._load_model()

        # Combine system prompt and user prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        try:
            import torch

            # Tokenize input
            inputs = self.tokenizer(
                full_prompt,
                return_tensors="pt",
                max_length=4096,
                truncation=True
            ).to(self.device)

            # Generate response
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_length=self.max_length,
                    temperature=self.temperature,
                    do_sample=True,
                    top_p=0.95,
                    num_return_sequences=1
                )

            # Decode output
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

            return generated_text

        except Exception as e:
            raise RuntimeError(f"Generation failed: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        """Get metadata including device info"""
        metadata = super().get_metadata()
        metadata["device"] = self.device
        metadata["local"] = True
        return metadata


class HuggingFaceAPIClient(ModelClient):
    """
    Hugging Face Inference API client (£9 FALLBACK).

    Uses Hugging Face's hosted inference API for users with less powerful hardware.
    Requires HF_TOKEN environment variable.

    Pricing: ~£9/month for Inference Pro

    Recommended models via API:
    - mistralai/Mistral-7B-Instruct-v0.1
    - meta-llama/Llama-2-7b-chat-hf
    - google/flan-t5-xxl (11B params)
    - moonshotai/Kimi-K2-Thinking:fastest
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Hugging Face API client using InferenceClient.

        Args:
            config: Must include:
                - model: Model name (e.g., "mistralai/Mistral-7B-Instruct-v0.1")
                - api_token: HF API token (or set HF_TOKEN env var)
                - max_tokens: Max tokens to generate (default: 2000)
                - temperature: Sampling temperature (default: 0.7)
        """
        super().__init__(config)
        self.api_token = config.get("api_token") or os.getenv("HF_TOKEN")
        if not self.api_token:
            raise ValueError("HF_TOKEN not found in config or environment")

        self.client = None
        self.model_name = config.get("model", "mistralai/Mistral-7B-Instruct-v0.1")
        self.max_tokens = config.get("max_tokens", 2000)
        self.temperature = config.get("temperature", 0.7)
        self.top_p = config.get("top_p", 0.7)

    def _init_client(self):
        """Lazy-initialize HuggingFace InferenceClient"""
        if self.client is not None:
            return

        try:
            from huggingface_hub import InferenceClient
            self.client = InferenceClient(api_key=self.api_token)
        except ImportError:
            raise RuntimeError(
                "huggingface_hub not installed. "
                "Install with: pip install huggingface_hub"
            )

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text using Hugging Face Inference API.

        Uses the chat.completions.create() API which is compatible with OpenAI's format.

        Args:
            prompt: User prompt
            system_prompt: Optional system instructions

        Returns:
            Generated text
        """
        self._init_client()

        # Prepare messages (OpenAI-compatible format)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            # Use chat completions API (non-streaming for simplicity)
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature,
                top_p=self.top_p,
                max_tokens=self.max_tokens,
                stream=False
            )

            # Extract generated text
            return response.choices[0].message.content

        except Exception as e:
            if "503" in str(e):
                raise RuntimeError("Model is loading, please try again in a few minutes")
            elif "401" in str(e) or "403" in str(e):
                raise RuntimeError("Invalid HF API token")
            else:
                raise RuntimeError(f"HuggingFace API error: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        """Get metadata including API info"""
        metadata = super().get_metadata()
        metadata["api"] = "Hugging Face Inference API"
        metadata["local"] = False
        return metadata


class OpenAIClient(ModelClient):
    """
    OpenAI API client (OPTIONAL).

    For users who prefer OpenAI's models or need GPT-4 capabilities.
    Requires OPENAI_API_KEY environment variable.

    Recommended models:
    - gpt-4-turbo-preview (best quality, most expensive)
    - gpt-3.5-turbo (good balance of quality and cost)
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize OpenAI client.

        Args:
            config: Must include:
                - model: Model name (e.g., "gpt-4", "gpt-3.5-turbo")
                - api_key: OpenAI API key (or set OPENAI_API_KEY env var)
                - max_tokens: Max tokens to generate (default: 2000)
                - temperature: Sampling temperature (default: 0.7)
        """
        super().__init__(config)
        self.api_key = config.get("api_key") or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found in config or environment")

        self.client = None
        self.max_tokens = config.get("max_tokens", 2000)
        self.temperature = config.get("temperature", 0.7)

    async def _init_client(self):
        """Lazy-initialize OpenAI client"""
        if self.client is not None:
            return

        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=self.api_key)
        except ImportError:
            raise RuntimeError(
                "openai package not installed. "
                "Install with: pip install openai"
            )

    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate text using OpenAI API.

        Args:
            prompt: User prompt
            system_prompt: Optional system instructions

        Returns:
            Generated text
        """
        await self._init_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.config.get("model", "gpt-3.5-turbo"),
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )

            return response.choices[0].message.content

        except Exception as e:
            raise RuntimeError(f"OpenAI API error: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        """Get metadata including API info"""
        metadata = super().get_metadata()
        metadata["api"] = "OpenAI"
        metadata["local"] = False
        return metadata
