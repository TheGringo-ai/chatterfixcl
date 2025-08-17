# 🔐 GitHub Actions Secrets Setup

Before pushing to trigger the CI/CD pipeline, configure these secrets in:
**GitHub → Repository → Settings → Secrets and variables → Actions**

## Required Secrets

### 🏗️ Google Cloud Platform
```
GCP_PROJECT_ID         = your-gcp-project-id
GCP_SA_KEY            = <service-account-json-key>
```

### 🗄️ Database
```
DATABASE_URL          = postgresql+asyncpg://user:pass@host:5432/dbname
```

### 🌐 Frontend
```
VITE_API_BASE         = https://your-staging-api-domain/api
NETLIFY_AUTH_TOKEN    = <netlify-personal-access-token>
NETLIFY_SITE_ID       = <netlify-site-id>
```

### 🔔 Push Notifications
```
PUSH_VAPID_PUBLIC     = <vapid-public-key>
PUSH_VAPID_PRIVATE    = <vapid-private-key>
```

### 🔑 Security
```
SECRET_KEY            = <random-256-bit-key>
```

---

## 🚀 Quick Setup Commands

### 1. Generate VAPID Keys
```bash
# Install web-push CLI
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Copy the output to PUSH_VAPID_PUBLIC and PUSH_VAPID_PRIVATE
```

### 2. Generate Secret Key
```bash
# Generate a secure random key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Get GCP Service Account Key
```bash
# Create service account with necessary permissions
gcloud iam service-accounts create chatterfix-deploy \
  --display-name="ChatterFix Deployment"

# Grant required roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatterfix-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatterfix-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:chatterfix-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Generate and download key
gcloud iam service-accounts keys create key.json \
  --iam-account="chatterfix-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com"

# Copy the entire contents of key.json to GCP_SA_KEY secret
```

### 4. Get Netlify Tokens
```bash
# 1. Go to https://app.netlify.com/user/applications#personal-access-tokens
# 2. Generate new access token → Copy to NETLIFY_AUTH_TOKEN

# 3. Get site ID from Netlify dashboard URL or:
# Go to Site settings → General → Site details → API ID
# Copy to NETLIFY_SITE_ID
```

---

## ✅ Verification Checklist

After setting all secrets, verify with:

1. **Secrets are set**: Go to GitHub repo → Settings → Secrets → Actions
2. **GCP permissions**: Service account has Cloud Run + Storage admin
3. **Database ready**: Cloud SQL Postgres instance provisioned
4. **Netlify site**: Created and linked to repo

---

## 🔥 Deployment Trigger

Once secrets are configured:

```bash
git add .
git commit -m "🚀 Enable CI/CD deployment pipeline"
git push origin main
```

The workflow will:
1. ✅ Build Docker image
2. ✅ Run Alembic migrations
3. ✅ Deploy to Cloud Run
4. ✅ Deploy frontend to Netlify
5. ✅ Run health checks
6. ✅ Update deployment status

---

**⏱️ Expected deployment time: ~8-12 minutes**