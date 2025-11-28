"""
AI Service Configuration
========================
Environment-based configuration for the AI service.
"""

from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

# Get the directory where this config file lives
CONFIG_DIR = Path(__file__).parent.resolve()


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    
    # Hugging Face - loaded from .env by pydantic_settings
    HF_API_TOKEN: Optional[str] = None
    
    # Model configurations - HuggingFace Inference Providers (Pro tier)
    # These models are available via providers like novita, together, cerebras, etc.
    MODEL_CHAT_PRIMARY: str = "meta-llama/Llama-3.3-70B-Instruct"  # Fast & capable
    MODEL_CHAT_FAST: str = "Qwen/Qwen3-32B"  # Smaller, quicker responses
    MODEL_CHAT_COMPLEX: str = "Qwen/Qwen2.5-72B-Instruct"  # Deep reasoning
    
    MODEL_VISION_OCR: str = "Qwen/Qwen2.5-VL-7B-Instruct"
    MODEL_OCR_PRINTED: str = "microsoft/trocr-large-printed"
    MODEL_OCR_HANDWRITTEN: str = "microsoft/trocr-base-handwritten"
    
    MODEL_EMBEDDINGS: str = "BAAI/bge-m3"
    MODEL_EMBEDDINGS_FAST: str = "BAAI/bge-small-en-v1.5"
    MODEL_RERANKER: str = "BAAI/bge-reranker-v2-m3"
    
    # Service configuration
    BACKEND_URL: str = "http://localhost:8000"
    AI_SERVICE_PORT: int = 8001
    
    # Rate limiting
    MAX_REQUESTS_PER_MINUTE: int = 60
    MAX_TOKENS_PER_REQUEST: int = 4096
    
    # RAG configuration
    CHROMA_PERSIST_DIR: str = "./data/chromadb"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    
    class Config:
        env_file = str(CONFIG_DIR / ".env")  # Absolute path to .env
        env_file_encoding = "utf-8"


settings = Settings()
