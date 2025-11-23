# Justice Companion AI Service Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# Base stage with Python and system dependencies
# =============================================================================
FROM python:3.11-slim AS base

# Install system dependencies for OCR and image processing
RUN apt-get update && apt-get install -y \
    # OCR dependencies
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    # Image processing
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    # Font rendering (for matplotlib, etc.)
    libfontconfig1 \
    libfreetype6 \
    # PDF processing
    poppler-utils \
    # Compression libraries
    liblzma-dev \
    zlib1g-dev \
    # Development tools
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r aiuser && useradd -r -g aiuser aiuser

# Set working directory
WORKDIR /app

# =============================================================================
# Dependencies stage - install Python packages
# =============================================================================
FROM base AS dependencies

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# =============================================================================
# Development stage - for development with hot reloading
# =============================================================================
FROM dependencies AS development

# Copy source code
COPY . .

# Create cache directories with proper permissions
RUN mkdir -p /app/models_cache \
             /app/uploads \
             /app/logs && \
    chown -R aiuser:aiuser /app

# Switch to non-root user
USER aiuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5051/health || exit 1

# Expose port
EXPOSE 5051

# Default command for development
CMD ["python", "main.py"]

# =============================================================================
# Production stage - optimized for production deployment
# =============================================================================
FROM dependencies AS production

# Copy source code
COPY . .

# Create cache directories with proper permissions
RUN mkdir -p /app/models_cache \
             /app/uploads \
             /app/logs && \
    chown -R aiuser:aiuser /app

# Pre-download common models (optional optimization)
# This can be disabled to save space if models are downloaded at runtime
RUN python -c "from sentence_transformers import SentenceTransformer; \
               SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder='/app/models_cache')" || true

# Switch to non-root user
USER aiuser

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    TRANSFORMERS_CACHE=/app/models_cache \
    HF_HOME=/app/models_cache \
    TORCH_HOME=/app/models_cache

# Health check
HEALTHCHECK --interval=45s --timeout=15s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5051/health || exit 1

# Expose port
EXPOSE 5051

# Production command
CMD ["python", "main.py"]

# =============================================================================
# Default target (can be overridden with --target flag)
# =============================================================================
FROM development
