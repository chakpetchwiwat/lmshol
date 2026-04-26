# Phase 4: AWS Infrastructure Migration - Research

## Research Summary
The goal is to move the e-learning platform to AWS. Current stack uses Supabase for storage and Prisma/PostgreSQL for DB.

### 1. Database (RDS)
- **Service**: Amazon RDS for PostgreSQL.
- **Prisma Integration**: Prisma works seamlessly with RDS. Need to update `DATABASE_URL` in `.env`.
- **Migration**: Use `npx prisma migrate deploy` to sync schema.

### 2. File Storage (S3)
- **Service**: Amazon S3.
- **SDK**: `@aws-sdk/client-s3` (v3).
- **Changes required**: Update `upload.routes.js` to use S3 client instead of Supabase.
- **Bucket Configuration**: Public Read (via CloudFront or Bucket Policy) for images/PDFs. Private for backups.

### 3. Backend (EC2)
- **Service**: Amazon EC2 (t3.small recommended).
- **Runtime**: Node.js 20+.
- **Process Manager**: PM2 for auto-restart and log management.
- **Security Group**: Open 80/443 (HTTP/S) and 22 (SSH).

### 4. Frontend (S3 + CloudFront)
- **Hosting**: S3 bucket configured for static hosting.
- **CDN**: CloudFront for HTTPS and performance.
- **Vite Config**: Ensure `BASE_URL` is correct.

## Technical Requirements
- AWS IAM User with S3, RDS, and EC2 permissions.
- AWS SDK v3 dependencies: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`.
- Environment variables:
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
  - `DATABASE_URL` (RDS)

## Validation Architecture
- **Connectivity**: Verify backend can talk to RDS and S3.
- **Security**: Verify S3 buckets are not overly permissive.
- **Performance**: CloudFront cache hit ratio.

## Detailed Implementation Steps

### Step 1: Infrastructure Setup (The Foundation)
1. **IAM**: Create a service user with `S3FullAccess` and `RDSFullAccess`. Generate Access Keys.
2. **S3**: Create two buckets: `scaleup-assets` (for uploads) and `scaleup-frontend` (for static hosting).
3. **RDS**: Provision a PostgreSQL instance in a private subnet. Note the endpoint.
4. **EC2**: Launch a Linux instance. Install Node.js, Git, and PM2.

### Step 2: Backend Code Migration
1. **Library Update**: Install `@aws-sdk/client-s3` and `@aws-sdk/lib-storage`.
2. **S3 Client Configuration**: Create a utility to initialize the S3 client using environment variables.
3. **Upload Logic**: Rewrite `src/routes/upload.routes.js` to stream files directly to S3 instead of Supabase.
4. **Prisma Config**: Update the `datasource db` provider if needed (already set to postgresql, so only the URL changes).

### Step 3: Frontend Deployment
1. **Build Config**: Update `VITE_API_URL` to point to the new EC2 Load Balancer or IP.
2. **Asset Hosting**: Build the project and sync the `dist` folder to the S3 frontend bucket.
3. **CDN**: Set up CloudFront to point to the S3 frontend bucket with a fallback to `index.html` (for SPA routing).

### Step 4: Data Migration (Optional)
1. Export data from the current database (e.g., via `pg_dump`).
2. Import data into the new RDS instance.
3. Transfer existing files from Supabase Storage to the new S3 bucket (can use a simple script or `rclone`).
