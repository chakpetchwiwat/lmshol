# Vercel Deployment Guide: Scaleup KM Platform

This project is configured for deployment on Vercel. Follow these steps to ensure a successful deployment for both the API and the WebApp.

## 1. Project Structure
The repository contains two main folders:
- `elearning-api`: Express.js Backend
- `elearning-webapp`: Vite/React Frontend

## 2. API Deployment (`elearning-api`)
### Vercel Configuration
- **Framework Preset**: Other (or Node.js)
- **Root Directory**: `elearning-api`
- **Build Command**: `npx prisma generate`
- **Output Directory**: `dist` (Vercel Node.js doesn't strictly need this, but the `postinstall` script handles Prisma)

### Environment Variables
Set these in the Vercel Dashboard for the API project:
- `NODE_ENV`: `production`
- `DATABASE_URL`: Your Supabase Transaction Pooler URL (Port 6543)
- `DIRECT_URL`: Your Supabase Direct Connection URL (Port 5432)
- `JWT_SECRET`: A strong random string
- `REDIS_URL`: Your Upstash/Redis connection string (Required for Rate Limiting)
- `REDIS_ENABLED`: `true`
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `ALLOWED_ORIGINS`: The URL of your deployed WebApp (e.g., `https://scaleup-km.vercel.app`)
- `TRUST_PROXY`: `1` (Vercel uses a proxy)

## 3. WebApp Deployment (`elearning-webapp`)
### Vercel Configuration
- **Framework Preset**: Vite
- **Root Directory**: `elearning-webapp`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Environment Variables
Set these in the Vercel Dashboard for the WebApp project:
- `VITE_API_URL`: The URL of your deployed API (e.g., `https://scaleup-api.vercel.app/api`)

## 4. Important Notes
### Row Level Security (RLS)
The database has RLS enabled. The API automatically propagates the user identity to the DB. Ensure the `DATABASE_URL` is correctly configured to allow the API to set session variables.

### File Uploads
Uploads are handled via Supabase Storage. Ensure you have created a bucket named `uploads` in your Supabase project and set it to **Public**.

### Rate Limiting
Without a valid `REDIS_URL`, rate limiting will fall back to in-memory, which is **not effective** in Vercel's serverless environment (each request may hit a different instance). Use **Upstash Redis** for the best experience.
