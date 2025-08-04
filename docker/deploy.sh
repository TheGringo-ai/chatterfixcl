#!/bin/bash

# ChatterFix Llama API Deployment Script
# Run this script to deploy to Google Cloud Run

set -e

# Configuration
PROJECT_ID="${1:-fredfix}"
REGION="${2:-us-central1}"
SERVICE_NAME="chatterfix-storage-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
BUCKET_NAME="chatterfix-documents-${PROJECT_ID}"

echo "🚀 Deploying ChatterFix Document Storage API to Google Cloud Run"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service Name: ${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Authenticate with Google Cloud
echo "🔐 Authenticating with Google Cloud..."
gcloud auth configure-docker

# Set the project
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "⚙️ Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable firestore.googleapis.com

# Create Google Cloud Storage bucket for documents
echo "🗄️ Creating storage bucket..."
gsutil mb -p ${PROJECT_ID} -c STANDARD -l ${REGION} gs://${BUCKET_NAME} 2>/dev/null || echo "Bucket already exists or creation failed"
gsutil cors set /dev/stdin gs://${BUCKET_NAME} <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Initialize Firestore (if not already done)
echo "📄 Initializing Firestore..."
gcloud firestore databases create --region=${REGION} 2>/dev/null || echo "Firestore already initialized"

# Build the Docker image using Google Cloud Build (no local Docker required)
echo "� Building Docker image with Google Cloud Build..."
gcloud builds submit --tag ${IMAGE_NAME} .

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 1 \
    --timeout 3600 \
    --concurrency 1 \
    --min-instances 0 \
    --max-instances 1 \
    --set-env-vars "STORAGE_BUCKET=${BUCKET_NAME},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo "✅ Deployment complete!"
echo "📍 Service URL: ${SERVICE_URL}"
echo "🔍 Health Check: ${SERVICE_URL}/health"
echo "📚 API Docs: ${SERVICE_URL}/docs"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10
if curl -f "${SERVICE_URL}/health" > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed. Check logs:"
    echo "gcloud run logs read ${SERVICE_NAME} --region ${REGION}"
fi

echo ""
echo "🎉 Your ChatterFix Llama API with Document Storage is now live!"
echo "💡 Next steps:"
echo "1. Update your React app environment variables:"
echo "   REACT_APP_LLAMA_API_URL=${SERVICE_URL}"
echo "   REACT_APP_STORAGE_API_URL=${SERVICE_URL}"
echo "   REACT_APP_STORAGE_BUCKET=${BUCKET_NAME}"
echo "2. Redeploy your React app to Netlify"
echo "3. Test the AI-powered custom fields and document management features"
echo "📄 Storage bucket: gs://${BUCKET_NAME}"
echo "🔍 Storage health: ${SERVICE_URL}/storage/health"
