# Backend Deployment Guide

## Problem
GitHub Pages only hosts static files (HTML, CSS, JS). Your Node.js backend needs to be deployed separately.

## Quick Deploy to Render (Recommended - Free)

### Step 1: Prepare Backend for Deployment

1. Ensure `backend/package.json` has a start script:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Step 2: Deploy to Render

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select `ADHD-MindSpark` repo
4. Configure:
   - **Name:** `mindspark-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` or `node server.js`
   - **Instance Type:** `Free`

### Step 3: Add Environment Variables

In Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Step 4: Setup PostgreSQL Database on Render

1. In Render dashboard, click "New +" → "PostgreSQL"
2. Name it `mindspark-db`
3. Select Free tier
4. After creation, copy the "Internal Database URL"
5. Paste it as `DATABASE_URL` in your web service environment variables

### Step 5: Update Frontend Configuration

1. After backend deploys, copy your Render backend URL (e.g., `https://mindspark-backend.onrender.com`)

2. Add GitHub Secrets:
   - Go to: https://github.com/Pranavipulluri/ADHD-MindSpark/settings/secrets/actions
   - Click "New repository secret"
   - Add:
     - `VITE_API_URL` = `https://mindspark-backend.onrender.com`
     - `VITE_WS_URL` = `wss://mindspark-backend.onrender.com`

3. Push any change to trigger rebuild:
```bash
git add .
git commit -m "Update deployment configuration"
git push origin main
```

## Alternative: Railway

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `ADHD-MindSpark` repo
5. Railway will auto-detect Node.js
6. Add environment variables in Railway dashboard
7. Railway provides PostgreSQL addon - click "New" → "Database" → "PostgreSQL"

## Alternative: Heroku (Paid)

```bash
# Install Heroku CLI
# Then run:
cd backend
heroku login
heroku create mindspark-backend
heroku addons:create heroku-postgresql:mini
git subtree push --prefix backend heroku main
```

## Testing After Deployment

1. Test backend health:
```bash
curl https://your-backend-url.onrender.com/health
```

2. Test signup:
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","username":"testuser"}'
```

## CORS Configuration

Make sure your backend allows requests from your frontend domain. In `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://mindspark.fit',
    'https://pranavipulluri.github.io'
  ],
  credentials: true
}));
```

## Troubleshooting

**Backend not responding:**
- Check Render logs in dashboard
- Verify environment variables are set
- Ensure PORT is set correctly (Render assigns dynamic port)

**Database connection failed:**
- Check DATABASE_URL is correct
- Verify PostgreSQL addon is active
- Run migrations if needed

**CORS errors:**
- Add your frontend domain to CORS origins
- Ensure credentials: true is set
