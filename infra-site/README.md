# Crafted Scriptor Static Site (S3 + CloudFront)

This sets up a private S3 bucket fronted by CloudFront (with OAI) to host the static web app. It does not touch your existing export APIs, so DOCX/PDF downloads keep working.

## What it creates
- S3 bucket (private) for the site
- CloudFront distribution with Origin Access Identity (OAI)
- SPA fallback (403/404 -> index.html)
- Optional custom domain via ACM (us-east-1)

## Deploy via AWS Console
1) Open CloudFormation in your region (e.g., ca-central-1)
2) Create stack → With new resources (standard)
3) Upload `infra-site/site.yml`
4) Parameters:
   - SiteBucketName: e.g., `crafted-scriptor-site-prod` (must be globally unique)
   - PriceClass: `PriceClass_100` is fine to start
   - Alias: leave empty for now (add your domain later)
   - AcmCertificateArn: leave empty unless you set Alias (must be in us-east-1)
5) Create stack and wait for CREATE_COMPLETE
6) Outputs: copy `DistributionDomainName` (e.g., dxxxx.cloudfront.net)

## Upload your site
- Upload files to the new S3 bucket:
  - index.html, main.js, style.css, images, etc.
- Recommended cache headers:
  - For versioned assets (e.g., main.[hash].js): `Cache-Control: public, max-age=31536000, immutable`
  - For index.html: `Cache-Control: no-cache`

### CLI example (optional):
```
aws s3 sync . s3://YOUR_SITE_BUCKET \
  --exclude "*" --include "index.html" --include "style.css" --include "main.js" --include "assets/*"
```

## Invalidate CloudFront cache on deploy
After uploading new files:
```
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Custom domain (optional)
1) Request/validate an ACM certificate in us-east-1 for your domain (e.g., `app.example.com`)
2) Update the stack providing `Alias` and `AcmCertificateArn`
3) Point a Route 53 alias (A/AAAA) to the CloudFront distribution

## Notes
- This stack uses CloudFront OAI for simplicity and reliability. If you later want OAC, we can migrate.
- No API changes are required; the app continues calling your existing AWS endpoints.
- For large documents, keep your Lambda sizes/timeouts as configured in `aws-exports/serverless.yml`.

## Rollback
- Deleting the stack will remove the distribution and bucket. If you want to keep the bucket, download backups first.
