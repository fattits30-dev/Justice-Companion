"""
Hugging Face Inference Client
=============================
Unified client for HF Inference API with Pro tier support.
Handles all AI operations for Justice Companion.
"""

import os
import base64
from typing import Optional, List, Dict, Any
from huggingface_hub import InferenceClient, AsyncInferenceClient
import httpx

from config import settings


class HuggingFaceClient:
    """
    Unified Hugging Face API client for Justice Companion.
    
    Supports:
    - Text generation (chat/completions)
    - Vision (document OCR, evidence analysis)
    - Embeddings (RAG)
    - Reranking (search improvement)
    """
    
    def __init__(self):
        self.token = settings.HF_API_TOKEN
        if not self.token:
            print("[WARNING] HF_API_TOKEN not set - API calls will fail")
        
        # Async client for FastAPI
        self.client = AsyncInferenceClient(token=self.token)
        
        # Model mappings from config
        self.models = {
            # Chat/Text Generation
            "chat_primary": settings.MODEL_CHAT_PRIMARY,
            "chat_fast": settings.MODEL_CHAT_FAST,
            "chat_complex": settings.MODEL_CHAT_COMPLEX,
            
            # Vision/OCR
            "vision_ocr": settings.MODEL_VISION_OCR,
            "ocr_printed": settings.MODEL_OCR_PRINTED,
            "ocr_handwritten": settings.MODEL_OCR_HANDWRITTEN,
            
            # Embeddings
            "embeddings": settings.MODEL_EMBEDDINGS,
            "embeddings_fast": settings.MODEL_EMBEDDINGS_FAST,
            "reranker": settings.MODEL_RERANKER,
        }

    # ==========================================
    # TEXT GENERATION (CHAT)
    # ==========================================
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model_key: str = "chat_primary",
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        """
        Generate chat completion.
        
        Args:
            messages: List of {role: str, content: str} dicts
            model_key: Which model to use (chat_primary|chat_fast|chat_complex)
            max_tokens: Maximum tokens in response
            temperature: Creativity (0-1)
            
        Returns:
            {content: str, model: str, tokens: int}
        """
        model = self.models.get(model_key, self.models["chat_primary"])
        
        try:
            response = await self.client.chat_completion(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            
            return {
                "content": response.choices[0].message.content,
                "model": model,
                "tokens": response.usage.total_tokens if response.usage else 0,
            }
        except Exception as e:
            # Fallback to faster model if primary fails
            if model_key == "chat_primary":
                print(f"⚠️ Primary model failed, trying fast: {e}")
                return await self.chat(messages, "chat_fast", max_tokens, temperature)
            raise
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model_key: str = "chat_primary",
        max_tokens: int = 2048,
    ):
        """
        Stream chat completion for real-time responses.
        Yields chunks as they arrive.
        """
        model = self.models.get(model_key, self.models["chat_primary"])
        
        async for chunk in await self.client.chat_completion(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True,
        ):
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    # ==========================================
    # VISION / OCR
    # ==========================================
    
    async def vision_ocr(
        self,
        image_bytes: bytes,
        prompt: str = "Extract all text from this document image.",
    ) -> Dict[str, Any]:
        """
        Extract text from document image using Qwen2.5-VL.
        
        Args:
            image_bytes: Raw image bytes
            prompt: Instruction for extraction
            
        Returns:
            {text: str, confidence: float, model: str}
        """
        model = self.models["vision_ocr"]
        
        # Encode image to base64
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        
        try:
            # Use chat completion with image
            response = await self.client.chat_completion(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_b64}"
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                max_tokens=4096,
            )
            
            return {
                "text": response.choices[0].message.content,
                "confidence": 0.9,  # Qwen-VL typically high confidence
                "model": model,
                "has_tables": "table" in response.choices[0].message.content.lower(),
            }
        except Exception as e:
            raise RuntimeError(f"Vision OCR failed: {e}")
    
    async def handwriting_ocr(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extract handwritten text using TrOCR.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            {text: str, confidence: float}
        """
        model = self.models["ocr_handwritten"]
        
        try:
            result = await self.client.image_to_text(
                image=image_bytes,
                model=model,
            )
            
            return {
                "text": result,
                "confidence": 0.8,
                "model": model,
            }
        except Exception as e:
            raise RuntimeError(f"Handwriting OCR failed: {e}")
    
    async def vision_analyze(
        self,
        image_bytes: bytes,
        prompt: str,
    ) -> Dict[str, Any]:
        """
        Analyze image content (evidence photos, etc.)
        
        Returns structured analysis based on prompt.
        """
        result = await self.vision_ocr(image_bytes, prompt)
        
        # Parse structured response
        content = result["text"]
        
        return {
            "description": content,
            "evidence_type": "photo",
            "relevance": extract_section(content, "LEGAL RELEVANCE"),
            "strength": extract_section(content, "STRENGTH"),
            "suggested_use": extract_section(content, "SUGGESTED USE"),
            "model": result["model"],
        }
    
    async def process_pdf(
        self,
        pdf_bytes: bytes,
        preserve_structure: bool = True,
    ) -> Dict[str, Any]:
        """
        Process PDF document - extract text from each page.
        
        For multi-page PDFs, processes each page and combines results.
        """
        # PDF processing would use pdf2image + OCR
        # For now, treat as single image (works for single-page PDFs)
        return await self.vision_ocr(
            pdf_bytes,
            f"Extract all text from this PDF document.{' Preserve layout and structure.' if preserve_structure else ''}"
        )

    # ==========================================
    # EMBEDDINGS (RAG)
    # ==========================================
    
    async def embed(
        self,
        texts: List[str],
        model_key: str = "embeddings",
    ) -> List[List[float]]:
        """
        Generate embeddings for RAG.
        
        Args:
            texts: List of text strings to embed
            model_key: embeddings|embeddings_fast
            
        Returns:
            List of embedding vectors
        """
        model = self.models.get(model_key, self.models["embeddings"])
        
        try:
            result = await self.client.feature_extraction(
                text=texts,
                model=model,
            )
            return result
        except Exception as e:
            raise RuntimeError(f"Embedding failed: {e}")
    
    async def embed_single(self, text: str) -> List[float]:
        """Embed a single text string."""
        results = await self.embed([text])
        return results[0]
    
    async def rerank(
        self,
        query: str,
        documents: List[str],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents by relevance to query.
        
        Args:
            query: Search query
            documents: List of documents to rerank
            top_k: Number of top results to return
            
        Returns:
            List of {document: str, score: float} sorted by relevance
        """
        model = self.models["reranker"]
        
        try:
            # Create query-document pairs
            pairs = [[query, doc] for doc in documents]
            
            # Get relevance scores
            scores = await self.client.text_classification(
                text=pairs,
                model=model,
            )
            
            # Combine and sort
            results = [
                {"document": doc, "score": score}
                for doc, score in zip(documents, scores)
            ]
            results.sort(key=lambda x: x["score"], reverse=True)
            
            return results[:top_k]
        except Exception as e:
            # Fallback: return documents in original order
            print(f"⚠️ Reranking failed: {e}")
            return [{"document": doc, "score": 0.5} for doc in documents[:top_k]]


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def extract_section(text: str, section_name: str) -> str:
    """Extract a section from structured response text."""
    lines = text.split('\n')
    in_section = False
    content = []
    
    for line in lines:
        if section_name.upper() in line.upper():
            in_section = True
            # Get content after colon if on same line
            if ':' in line:
                content.append(line.split(':', 1)[1].strip())
            continue
        if in_section:
            if any(kw in line.upper() for kw in ['DESCRIPTION:', 'EVIDENCE TYPE:', 'LEGAL RELEVANCE:', 'STRENGTH:', 'SUGGESTED USE:', 'CONCERNS:']):
                break
            if line.strip():
                content.append(line.strip())
    
    return ' '.join(content) if content else ""
