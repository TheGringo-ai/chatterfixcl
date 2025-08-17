#!/bin/bash
# 🔐 ChatterFix Deployment Secrets Setup
# Run this script to configure all GitHub Actions secrets

set -e

echo "🔐 Setting up ChatterFix deployment secrets..."
echo ""

# Function to set a secret safely
set_secret() {
    local name="$1"
    local value="$2"
    local description="$3"
    
    if [ -z "$value" ]; then
        echo "❌ $name is empty, skipping..."
        return 1
    fi
    
    echo "Setting $name... ($description)"
    echo "$value" | gh secret set "$name"
    echo "✅ $name set successfully"
    echo ""
}

echo "📋 Please provide the following values:"
echo ""

# GCP Project ID
read -p "GCP_PROJECT_ID (your-gcp-project-id): " GCP_PROJECT_ID
set_secret "GCP_PROJECT_ID" "$GCP_PROJECT_ID" "Google Cloud Project ID"

# Database URL
echo "DATABASE_URL should be: postgresql+asyncpg://user:pass@host:5432/dbname"
read -p "DATABASE_URL: " DATABASE_URL
set_secret "DATABASE_URL" "$DATABASE_URL" "PostgreSQL connection string"

# VAPID Keys
echo ""
echo "🔔 VAPID Keys for push notifications"
echo "Generate with: npm install -g web-push && web-push generate-vapid-keys"
read -p "PUSH_VAPID_PUBLIC: " PUSH_VAPID_PUBLIC
read -p "PUSH_VAPID_PRIVATE: " PUSH_VAPID_PRIVATE
set_secret "PUSH_VAPID_PUBLIC" "$PUSH_VAPID_PUBLIC" "VAPID public key"
set_secret "PUSH_VAPID_PRIVATE" "$PUSH_VAPID_PRIVATE" "VAPID private key"

# Netlify
echo ""
echo "🌐 Netlify deployment credentials"
echo "Get from: https://app.netlify.com/user/applications#personal-access-tokens"
read -p "NETLIFY_AUTH_TOKEN: " NETLIFY_AUTH_TOKEN
read -p "NETLIFY_SITE_ID: " NETLIFY_SITE_ID
set_secret "NETLIFY_AUTH_TOKEN" "$NETLIFY_AUTH_TOKEN" "Netlify API token"
set_secret "NETLIFY_SITE_ID" "$NETLIFY_SITE_ID" "Netlify site identifier"

# API Base URL
read -p "VITE_API_BASE (https://your-api-domain/api): " VITE_API_BASE
set_secret "VITE_API_BASE" "$VITE_API_BASE" "Frontend API base URL"

# Secret Key
echo ""
echo "🔑 Generating secure SECRET_KEY..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
set_secret "SECRET_KEY" "$SECRET_KEY" "Application secret key"

# GCP Service Account Key
echo ""
echo "🏗️  GCP Service Account Key"
echo "This should be the entire JSON content from your service account key file"
echo "Paste the JSON content and press Ctrl+D when done:"
GCP_SA_KEY=$(cat)
set_secret "GCP_SA_KEY" "$GCP_SA_KEY" "GCP service account JSON key"

echo ""
echo "🎉 All secrets configured successfully!"
echo ""
echo "Next steps:"
echo "1. Go to GitHub → Your repo → Actions"
echo "2. Re-run any failed workflows"
echo "3. Watch your app deploy to production! 🚀"
echo ""
echo "Check deployment status: gh run list"