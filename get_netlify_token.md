# 🔑 Get Your Netlify Access Token

You need to get your Netlify Personal Access Token for GitHub Actions.

## Method 1: Via Netlify Dashboard (Recommended)

1. Go to: https://app.netlify.com/user/applications#personal-access-tokens
2. Click "New access token"
3. Give it a name like "ChatterFix GitHub Actions"
4. Copy the token (it will only be shown once!)

## Method 2: Via Netlify CLI (if logged in)

The Netlify CLI stores your token, but doesn't expose it directly.
You can check your auth status with:

```bash
netlify status
```

## ⚠️ Once you have the token:

Set it as a GitHub secret:

```bash
gh secret set NETLIFY_AUTH_TOKEN --body "YOUR_NETLIFY_TOKEN_HERE"
```

## 🎯 Current Netlify Setup:

- **Site ID**: `182b1723-8036-4f29-b901-9e81fbe297d7` ✅ (already set)
- **Site URL**: https://chatterfix.netlify.app ✅
- **Admin Panel**: https://app.netlify.com/projects/chatterfix ✅
- **Auth Token**: ❌ (need to set this)

Once you set the `NETLIFY_AUTH_TOKEN`, your frontend deployment will work automatically!