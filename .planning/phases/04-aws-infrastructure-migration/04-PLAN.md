# Phase 4: AWS Infrastructure Migration - Plan

```yaml
wave: 1
depends_on: []
files_modified:
  - elearning-api/package.json
  - elearning-api/src/routes/upload.routes.js
  - elearning-api/.env.example
  - elearning-webapp/.env.example
autonomous: true
```

<objective>
Migrate the e-learning platform to AWS infrastructure, replacing Supabase storage with AWS S3 and local/Vercel hosting with EC2 and S3/CloudFront.
</objective>

## Tasks

### Wave 1: Dependencies & Configuration

<task id="1">
<title>Install AWS SDK dependencies</title>
<read_first>
- elearning-api/package.json
</read_first>
<action>
Add `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` to `elearning-api/package.json` dependencies.
</action>
<acceptance_criteria>
- `elearning-api/package.json` contains `@aws-sdk/client-s3`
- `elearning-api/package.json` contains `@aws-sdk/lib-storage`
</acceptance_criteria>
</task>

<task id="2">
<title>Update Environment Templates</title>
<read_first>
- elearning-api/.env.example
- elearning-webapp/.env.example
</read_first>
<action>
Add AWS configuration keys to `.env.example` files.
Backend: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`.
Frontend: `VITE_AWS_CLOUDFRONT_URL`.
</action>
<acceptance_criteria>
- `elearning-api/.env.example` contains AWS keys.
- `elearning-webapp/.env.example` contains VITE_AWS_CLOUDFRONT_URL.
</acceptance_criteria>
</task>

### Wave 2: Backend S3 Integration

<task id="3">
<title>Refactor Upload Routes to use AWS S3</title>
<read_first>
- elearning-api/src/routes/upload.routes.js
</read_first>
<action>
Replace Supabase client with S3Client from `@aws-sdk/client-s3`.
Implement `uploadToS3` utility function using `Upload` from `@aws-sdk/lib-storage` for multipart uploads.
Update `uploadToSupabase` (rename to `uploadToS3`) to use the new client.
</action>
<acceptance_criteria>
- `elearning-api/src/routes/upload.routes.js` no longer imports `@supabase/supabase-js`.
- `elearning-api/src/routes/upload.routes.js` imports `@aws-sdk/client-s3`.
- Upload endpoint returns valid S3/CloudFront URLs.
</acceptance_criteria>
</task>

### Wave 3: Deployment Runbook (Documentation)

<task id="4">
<title>Create AWS Deployment Runbook</title>
<read_first>
- .planning/ROADMAP.md
</read_first>
<action>
Create `DEPLOYMENT_AWS.md` with step-by-step instructions for:
1. RDS PostgreSQL setup and Prisma migration.
2. EC2 Node.js environment setup (PM2, Nginx).
3. S3 Bucket policies for static hosting and assets.
4. CloudFront Distribution setup.
</action>
<acceptance_criteria>
- `DEPLOYMENT_AWS.md` exists in project root.
- Includes RDS, EC2, S3, and CloudFront sections.
</acceptance_criteria>
</task>

## Verification Criteria

### Functional
- [ ] Image upload works and returns S3/CloudFront URL.
- [ ] PDF upload for certificates works.
- [ ] Course preview videos (if hosted) load via CloudFront.

### Security
- [ ] S3 bucket is not public (Access via CloudFront OAI/OAC only).
- [ ] IAM User has least privilege.

## Must Haves (Goal-Backward)
- System must be fully operational on AWS without relying on Supabase or Vercel.
- All existing assets must be accessible via the new infrastructure.
