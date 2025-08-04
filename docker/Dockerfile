# Dockerfile for ChatterFix Llama API
# Use Python base image optimized for Cloud Run
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for document processing
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy API code
COPY api/ /app/

# Create startup script (document storage only, no Ollama)
RUN echo '#!/bin/bash\ncd /app && uvicorn main:app --host 0.0.0.0 --port 8080' > /app/start.sh

RUN chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Start the application
CMD ["/app/start.sh"]
