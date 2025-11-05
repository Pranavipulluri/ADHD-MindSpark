# Render Environment Variables Setup

Go to your Render dashboard → mindspark-backend → Environment → Add the following:

## Required for AI Features:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Required for App:
```
NODE_ENV=production
FRONTEND_URL=https://mindspark.fit
JWT_SECRET=your_jwt_secret_here
```

## Database (should already be set):
```
DATABASE_URL=[Your PostgreSQL connection string from Render]
```

## Optional (for enhanced features):
```
OPENAI_API_KEY=your_openai_key_here
GROQ_API_KEY=your_groq_key_here
HUGGINGFACE_API_KEY=your_huggingface_key_here
```

## Steps to Add on Render:
1. Go to https://dashboard.render.com
2. Click on your `mindspark-backend` service
3. Go to **Environment** tab on the left
4. Click **Add Environment Variable**
5. Add each variable above (Key = Value)
6. Click **Save Changes**
7. Render will automatically redeploy with new variables

⚠️ **IMPORTANT**: After adding variables, Render will redeploy automatically. Wait 2-3 minutes for deployment to complete.

## Test After Setup:
1. Try uploading a document at https://mindspark.fit
2. Try chatting with AI
3. Check Render logs for any errors: Dashboard → Logs tab

