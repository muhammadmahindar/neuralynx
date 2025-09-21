# AWS Deployment Setup

This document explains how to set up automated deployment to AWS using GitHub Actions.

## Prerequisites

1. AWS Account with appropriate permissions
2. GitHub repository with this codebase
3. AWS CLI configured locally (for initial setup)

## AWS Setup

### 1. Create IAM Role for GitHub Actions

You need to create an IAM role that GitHub Actions can assume using OpenID Connect (OIDC). This is more secure than using long-lived access keys.

#### Step 1: Create OIDC Identity Provider

1. Go to AWS IAM Console → Identity providers
2. Click "Add provider"
3. Select "OpenID Connect"
4. Provider URL: `https://token.actions.githubusercontent.com`
5. Audience: `sts.amazonaws.com`
6. Click "Add provider"

#### Step 2: Create IAM Role

1. Go to AWS IAM Console → Roles
2. Click "Create role"
3. Select "Web identity"
4. Identity provider: `token.actions.githubusercontent.com`
5. Audience: `sts.amazonaws.com`
6. Add condition (replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME`):
   ```json
   {
     "StringEquals": {
       "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
     },
     "StringLike": {
       "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:ref:refs/heads/main"
     }
   }
   ```
7. Attach the following policies:
    - `CloudFormationFullAccess`
   - `S3FullAccess`
   - `CloudFrontFullAccess`
   - `IAMFullAccess` (needed for CDK bootstrap)
8. Name the role (e.g., `GitHubActionsDeploymentRole`)
9. Copy the Role ARN for later use

### 2. Bootstrap CDK (One-time setup)

Run this command locally to bootstrap CDK in your AWS account:

```bash
cd cdk
npm install
npx cdk bootstrap
```

## GitHub Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secret:

- `AWS_ROLE_ARN`: The ARN of the IAM role you created above

### 2. Enable GitHub Actions

Ensure GitHub Actions are enabled for your repository:

- Go to repository Settings → Actions → General
- Under "Actions permissions", select "Allow all actions and reusable workflows"

## Deployment Process

### Automatic Deployment

The deployment will automatically trigger when:

- Code is pushed to the `main` branch
- A pull request is merged to `main`

### Manual Deployment

You can also trigger deployment manually:

1. Go to Actions tab in your GitHub repository
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

## What the Deployment Does

1. **Build Website**: Compiles the React application using Vite
2. **Copy Assets**: Copies built files to CDK directory
3. **Deploy Infrastructure**: Uses AWS CDK to:
   - Create/update S3 bucket for hosting
   - Create/update CloudFront distribution for CDN
   - Deploy website files to S3
   - Invalidate CloudFront cache

## Outputs

After successful deployment, you'll see outputs in the GitHub Actions logs:

- CloudFront domain name (your website URL)
- S3 bucket website URL

## Troubleshooting

### Common Issues

1. **Bootstrap Error**: If you see CDK bootstrap errors, run `npx cdk bootstrap` locally first
2. **Permission Denied**: Check that your IAM role has all required permissions
3. **Trust Relationship**: Ensure the IAM role trust relationship includes your exact repository path

### Local Testing

To test the deployment locally:

```bash
# Build website
cd website
npm install
npm run build

# Copy to CDK
cd ../cdk
rm -rf website
mkdir website
cp -r ../website/dist/* website/

# Deploy
npm install
npm run build
npx cdk deploy
```

## Security Notes

- The OIDC setup is more secure than using long-lived AWS access keys
- The IAM role is restricted to only your specific repository and branch
- Consider using least-privilege principles for production deployments

## Cost Considerations

This setup uses:

- S3 for static hosting (minimal cost for static files)
- CloudFront for CDN (free tier available, pay for data transfer)
- No additional AWS services with ongoing costs

Most small to medium websites will stay within AWS free tier limits.
