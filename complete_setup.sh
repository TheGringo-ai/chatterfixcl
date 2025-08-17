#!/bin/bash
# 🚀 Complete ChatterFix Deployment Setup
# This script helps you set the remaining required secrets

echo "🎉 Netlify is ready! Site: https://chatterfix.netlify.app"
echo "📋 Already configured: NETLIFY_SITE_ID, VAPID keys, SECRET_KEY"
echo ""
echo "🔑 Remaining secrets needed:"
echo ""

# Function to set secret
set_secret() {
    local name="$1"
    local value="$2"
    if [ -n "$value" ]; then
        echo "$value" | gh secret set "$name"
        echo "✅ $name set successfully"
    else
        echo "❌ $name was empty, skipped"
    fi
}

# Netlify Auth Token
echo "1️⃣ NETLIFY_AUTH_TOKEN"
echo "   Get from: https://app.netlify.com/user/applications#personal-access-tokens"
read -p "   Enter your Netlify access token: " NETLIFY_TOKEN
set_secret "NETLIFY_AUTH_TOKEN" "$NETLIFY_TOKEN"
echo ""

# GCP Project ID
echo "2️⃣ GCP_PROJECT_ID"
read -p "   Enter your Google Cloud Project ID: " GCP_PROJECT
set_secret "GCP_PROJECT_ID" "$GCP_PROJECT"
echo ""

# Database URL
echo "3️⃣ DATABASE_URL"
echo "   Format: postgresql+asyncpg://user:pass@host:5432/dbname"
read -p "   Enter your PostgreSQL connection string: " DB_URL
set_secret "DATABASE_URL" "$DB_URL"
echo ""

# Update API Base URL with real project
if [ -n "$GCP_PROJECT" ]; then
    echo "4️⃣ Updating VITE_API_BASE with your project..."
    API_BASE="https://chatterfix-api-us-central1-${GCP_PROJECT}.run.app/api"
    set_secret "VITE_API_BASE" "$API_BASE"
    echo "   Set to: $API_BASE"
fi
echo ""

echo "🔍 Checking what's still needed..."
echo "📄 You still need to set manually:"
echo "   - GCP_SA_KEY (your service account JSON key)"
echo ""
echo "💡 To set GCP_SA_KEY:"
echo "   gh secret set GCP_SA_KEY < path/to/your/service-account-key.json"
echo ""

# Show current secrets
echo "✅ Current secrets:"
gh secret list

echo ""
echo "🚀 Once GCP_SA_KEY is set, your deployment will be complete!"
echo "   Check progress: gh run list"