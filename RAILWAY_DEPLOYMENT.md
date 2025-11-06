# 🚀 Railway Backend Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- GitHub connected to Railway
- PostgreSQL database ready

## Step-by-Step Deployment

### 1️⃣ Deploy Backend to Railway

1. **Go to Railway Dashboard**
   - Open: https://railway.com/dashboard
   - Click on your `mindspark-backend` project

2. **Deploy from GitHub**
   - Click "New Service" → "GitHub Repo"
   - Select `Pranavipulluri/ADHD-MindSpark`
   - Set **Root Directory**: `backend`
   - Railway will auto-detect Node.js

3. **Add PostgreSQL Database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will create a database and link it automatically
   - The `DATABASE_URL` will be available as environment variable

4. **Configure Environment Variables**
   Go to your backend service → Variables tab and add:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your-super-secret-random-string-here-min-32-chars
   ```
   
   Railway automatically provides:
   - `DATABASE_URL` (from PostgreSQL service)
   - `PORT` (can override if needed)

5. **Deploy**
   - Railway will automatically deploy
   - Wait for build to complete
   - Copy your backend URL (e.g., `mindspark-backend-production.up.railway.app`)

### 2️⃣ Initialize Database Schema

After deployment, run migrations:

1. **Open Railway Dashboard** → Your Backend Service → "Shell" tab
2. Run:
   ```bash
   node scripts/init-db.js
   ```

Or use Railway CLI:
```bash
railway run node scripts/init-db.js
```

### 3️⃣ Update Frontend Environment Variables

1. **Get your Railway backend URL** (e.g., `https://mindspark-backend-production.up.railway.app`)

2. **Update GitHub Secrets** for frontend deployment:
   - Go to: https://github.com/Pranavipulluri/ADHD-MindSpark/settings/secrets/actions
   - Add new secret:
     - Name: `VITE_API_URL`
     - Value: `https://your-backend-url.railway.app`

3. **Update GitHub Actions Workflow** (already done ✅)

4. **For WebSocket** (if needed):
   - Add secret: `VITE_WS_URL`
   - Value: `wss://your-backend-url.railway.app`

### 4️⃣ Redeploy Frontend

After updating secrets:
```bash
git add .
git commit -m "Update API config for production"
git push origin main
```

GitHub Actions will automatically rebuild with the new environment variable.

### 5️⃣ Test Your Deployed App

1. **Open your site**: https://mindspark.fit
2. **Click "Sign In"**
3. **Try creating an account**
4. **Check browser console** for any errors

---

## 🔧 Troubleshooting

### Backend not responding:
1. Check Railway logs: Dashboard → Your Service → "Deployments" → Latest → "View Logs"
2. Verify environment variables are set
3. Check database connection

### CORS errors:
- Backend `server.js` already includes your domain in CORS
- Verify your domain is: `mindspark.fit`

### Database connection failed:
1. Make sure PostgreSQL service is running
2. Check `DATABASE_URL` is set in backend service
3. Run migrations: `railway run node scripts/init-db.js`

### "Failed to fetch" errors:
1. Verify `VITE_API_URL` secret is set in GitHub
2. Check that frontend rebuild triggered after adding secret
3. Verify Railway backend is deployed and running

---

## 📝 Quick Commands

### Railway CLI (Optional)
```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up

# View logs
railway logs

# Run commands
railway run node scripts/init-db.js
```

---

## ✅ Checklist

- [ ] Railway backend deployed
- [ ] PostgreSQL database created and linked
- [ ] Environment variables set (JWT_SECRET, NODE_ENV)
- [ ] Database schema initialized
- [ ] Backend URL copied
- [ ] GitHub secret `VITE_API_URL` added
- [ ] Frontend redeployed
- [ ] Tested sign up/login on live site

---

## 🌐 Your URLs

- **Frontend**: https://mindspark.fit
- **Backend**: https://your-backend-url.railway.app (get from Railway dashboard)
- **Health Check**: https://your-backend-url.railway.app/health
- **API**: https://your-backend-url.railway.app/api

---

## 💡 Tips

1. **Free Tier Limits**: Railway gives $5 free credits/month
2. **Automatic Deployments**: Every push to `main` redeploys backend
3. **Database Backups**: Enable in Railway PostgreSQL settings
4. **Custom Domain**: Can add custom domain for backend in Railway settings
5. **Monitoring**: Use Railway's built-in metrics and logs
