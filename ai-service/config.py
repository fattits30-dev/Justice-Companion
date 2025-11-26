"""
AI Service Configuration
========================
Environment-based configuration for the AI service.
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    
    # Hugging Face
    HF_API_TOKEN: Optional[str] = os.getenv("HF_API_TOKEN")
    
    # Model configurations - Using HF Inference API compatible models
    MODEL_CHAT_PRIMARY: str = "mistralai/Mistral-7B-Instruct-v0.2"
    MODEL_CHAT_FAST: str = "HuggingFaceH4/zephyr-7b-beta"
    MODEL_CHAT_COMPLEX: str = "mistralai/Mixtral-8x7B-Instruct-v0.1"
    
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
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
