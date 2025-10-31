# Deployment Guide

## Step 1: Push to GitHub

### Option A: If you already have a GitHub repository

```bash
# Add your GitHub repository as remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Option B: Create a new GitHub repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `prop-trenz`)
3. **Don't** initialize with README, .gitignore, or license (you already have files)
4. Copy the repository URL (e.g., `https://github.com/YOUR_USERNAME/prop-trenz.git`)
5. Run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Netlify

### Via Netlify Dashboard (Recommended)

1. **Go to Netlify**: https://app.netlify.com
2. **Sign up/Login** with your GitHub account
3. **Click "Add new site" → "Import an existing project"**
4. **Choose GitHub** and authorize Netlify
5. **Select your repository** (`prop-trenz`)
6. **Configure build settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Base directory**: (leave empty unless repo is in subfolder)

7. **Set Environment Variables**:
   - Go to Site Settings → Environment Variables
   - Add these variables:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
     - `NEXT_PUBLIC_MAPBOX_TOKEN` = your Mapbox token (optional)

8. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Via Netlify CLI (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

## Step 3: Configure Supabase for Production

### Update Allowed Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Netlify site URL to **Redirect URLs**:
   - `https://your-site.netlify.app/**`
   - `https://your-site.netlify.app/auth/callback`

3. For Google OAuth:
   - Update **Authorized redirect URIs** in Google Cloud Console:
     - `https://your-site.netlify.app/auth/callback`
     - Keep: `https://your-project.supabase.co/auth/v1/callback`

### Deploy Edge Function

1. Go to Supabase Dashboard → Edge Functions
2. Create/Edit function: `delete-user`
3. Copy code from `supabase/functions/delete-user/index.ts`
4. Add secret: `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy

## Step 4: Run Database Migrations

1. Go to Supabase Dashboard → SQL Editor
2. Run these SQL files in order:
   - `database/schema.sql` (if not already run)
   - `database/insights.sql`
   - `database/delete_user_complete.sql`

## Environment Variables Needed

Make sure these are set in Netlify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN` (optional)

**Note**: Never commit `.env.local` or `.env` files with actual keys to GitHub!


