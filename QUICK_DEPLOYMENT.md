# 🚀 ChatterFix CMMS - Quick Deployment Guide

## Phase 1 — Local → Staging (smoke it end-to-end)

### Step 1: Point services at Postgres

#### Backend Environment (.env)
```bash
# Copy and customize
cp api/.env.production api/.env

# Edit with your values:
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/chatterfix?sslmode=require
POOL_MIN=2
POOL_MAX=15
POOL_TIMEOUT=30
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
SECRET_KEY=your_secret_key_here
```

#### Frontend Environment (.env)
```bash
# Copy and customize
cp .env.production .env.local

# Edit with your values:
VITE_API_BASE=https://your-staging-api-domain/api
VITE_PUSH_PUBLIC_KEY=your_vapid_public_key
```

### Step 2: Run migrations & seed minimal data

```bash
# Export your database URL
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/chatterfix?sslmode=require'

# Run database setup
cd database
python setup.py setup

# Run migrations
python -m migrations

# Seed minimal production data
cd ../api
python -m scripts.seed_minimal
```

### Step 3: Boot everything (staging)

#### Backend (FastAPI)
```bash
cd api
uvicorn main_db:app --host 0.0.0.0 --port 8080
```

#### Frontend (React PWA)
```bash
cd ..
VITE_API_BASE=http://localhost:8080/api npm run dev
```

### 🔍 Smoke Test Checklist (2 minutes)

Open browser to `http://localhost:3000` and verify:

✅ **Work Order Flow:**
- Create WO → submit for approval → approve → status becomes APPROVED
- Add cost entries → verify financial totals update  

✅ **SLA & Escalation:**
- Check SLA status shows countdown
- Force escalate returns escalation data

✅ **Preventive Maintenance:**
- PM template → schedule rule (time trigger)
- Next occurrence generates properly

✅ **Offline Sync:**
- Toggle offline (DevTools → Network → Offline)
- Create/edit PM task → go online → confirm sync resolves

✅ **PWA Features:**
- Install prompt appears (mobile/desktop)
- Service worker registers successfully
- Offline functionality works

---

## Phase 2 — Wire Offline Sync (server + PWA)

### Step 4: Confirm sync endpoints
Your sync endpoints are already implemented at:
- `POST /api/sync/batch` - Batch sync operations
- `GET /api/sync/status/{client_id}` - Sync status
- `GET /api/sync/changes/{client_id}` - Server changes
- `POST /api/sync/ping` - Connectivity check

### Step 5: PWA registration + background sync

✅ **Service Worker** (`public/service-worker.js`):
- Cache-first for app shell
- Network-with-background-fallback for API writes  
- Background sync tag: `sync-chatterfix`
- Push notification support

✅ **Sync Manager** (`src/utils/enhancedSyncManager.ts`):
- Bidirectional sync
- Conflict resolution (server-wins default)
- Real-time status updates

---

## Phase 3 — CI/CD (repeatable + safe)

### Step 6: GitHub Secrets Setup

Go to GitHub → Repo → Settings → Secrets and add:

```
# Google Cloud Platform
GCP_PROJECT_ID=your-project-id
GCP_SA_KEY=your-service-account-json-key

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/chatterfix?sslmode=require

# Frontend
VITE_API_BASE=https://your-backend-domain/api
BACKEND_DOMAIN=your-backend-domain.run.app

# Netlify
NETLIFY_AUTH_TOKEN=your-netlify-auth-token
NETLIFY_SITE_ID=your-netlify-site-id

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Security
SECRET_KEY=your-secret-key-here
```

### Step 7: Deploy Backend → Cloud Run

Workflow is configured in `.github/workflows/deploy-backend.yml`

Push to main branch triggers:
1. Docker build and push to GCR
2. Database migrations
3. Cloud Run deployment  
4. Health check verification

### Step 8: Deploy Frontend → Netlify

Workflow is configured in `.github/workflows/deploy-frontend.yml`

Push to main branch triggers:
1. React build with PWA optimization
2. Netlify deployment with proper headers
3. PWA verification (manifest, service worker)
4. Lighthouse CI audit

---

## Phase 4 — Backups, PITR, Monitoring

### Step 9: Database Backups

```bash
# Manual backup
python -m database.backup create

# Automated daily backups (add to cron)
0 2 * * * /path/to/python -m database.backup create

# Cleanup old backups
python -m database.backup cleanup
```

### Step 10: Monitoring & Observability

#### Performance Monitoring
```bash
# Generate performance report
python -m database.performance

# Run optimization
python -m database.performance optimize_database
```

#### Health Checks
- API: `GET /health`
- Database: Built into health endpoint
- PWA: Lighthouse CI in deployment

---

## Phase 5 — Production Cutover

### Quick "Do Now" Commands

#### 1. Database Setup
```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/chatterfix?sslmode=require'
cd database && python setup.py setup
```

#### 2. Start Backend
```bash
cd api
uvicorn main_db:app --port 8080
curl http://localhost:8080/health
```

#### 3. Start Frontend  
```bash
VITE_API_BASE=http://localhost:8080/api npm run build && npm run preview
```

### 🎯 Production Cutover Checklist

✅ **Pre-deployment:**
- [ ] Database migrations at head
- [ ] Environment variables configured
- [ ] Secrets added to GitHub
- [ ] Backup strategy tested

✅ **Deployment:**
- [ ] Backend health checks pass `/health`
- [ ] Frontend PWA installs correctly
- [ ] Sync endpoints responding  
- [ ] Push notifications working

✅ **Post-deployment:**
- [ ] Create test work order end-to-end
- [ ] Verify offline functionality  
- [ ] Check financial totals reconcile
- [ ] Test PM scheduling works

---

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Service Worker Issues
```bash
# Check registration
# Browser DevTools → Application → Service Workers

# Force update
# Browser DevTools → Application → Storage → Clear Storage

# Debug sync
# Browser DevTools → Application → IndexedDB → ChatterFixCMMS
```

### API Issues
```bash
# Check health
curl https://your-api-domain/health

# Check specific endpoints
curl https://your-api-domain/api/assets
curl https://your-api-domain/api/preventive-maintenance/tasks
```

---

## 📞 Support Commands

### Generate VAPID Keys
```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

### Test Push Notifications
```bash
# Test endpoint (replace with your values)
curl -X POST https://your-api-domain/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'
```

### Database Performance
```bash
# Full performance report
python -m database.performance

# Quick optimization
python -m database.performance optimize_database
```

---

## 🎉 Success Indicators

Your deployment is successful when:

✅ All health checks pass  
✅ PWA installs on mobile devices  
✅ Offline → online sync works  
✅ Work orders flow through approval  
✅ PM tasks schedule correctly  
✅ Financial totals calculate properly  
✅ Push notifications deliver  

**You now have an enterprise-grade CMMS that rivals $50k+ commercial solutions!**