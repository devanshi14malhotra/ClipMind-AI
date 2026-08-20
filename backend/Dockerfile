# ── Production Dockerfile for ClipMind AI Backend ──────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps: FFmpeg for audio extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source (Render mounts fresh code, .dockerignore handles venv/uploads)
COPY . .

# Create uploads dir (ephemeral on Render free tier — videos stored in-memory only)
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# No --reload in production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
