# Neuralynx Infrastructure

AWS CDK infrastructure for deploying the Neuralynx AI-powered content optimization platform.

## 🏗️ Architecture

- **S3 Bucket**: Static website hosting for the React frontend
- **CloudFront**: Global CDN distribution for fast content delivery
- **Route 53**: DNS management (optional)
- **ACM**: SSL certificate management

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`
- Node.js (v18 or higher)

### Installation

```bash
cd cdk
npm install
```

### Deployment

```bash
# Deploy the infrastructure
npm run deploy

# See what will be deployed
npx cdk diff

# View CloudFormation template
npx cdk synth
```

## 📁 Structure

```
cdk/
├── bin/
│   └── hack.ts              # CDK app entry point
├── lib/
│   └── s3-static-website-stack.ts  # Main infrastructure stack
├── test/                    # CDK tests
├── website/                 # Built frontend files (auto-generated)
└── package.json
```

## 🔧 Configuration

### Domain Setup

Update the domain in `lib/s3-static-website-stack.ts`:

```typescript
const DOMAIN_NAME = 'your-domain.com';
```

### Environment Variables

Set your AWS region and account:

```bash
export CDK_DEFAULT_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=123456789012
```

## 🧪 Testing

```bash
# Run CDK tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📋 Available Commands

```bash
# Build TypeScript
npm run build

# Watch for changes
npm run watch

# Deploy stack
npm run deploy

# Destroy stack
npm run destroy

# List all stacks
npx cdk list

# Show differences
npx cdk diff

# Synthesize CloudFormation
npx cdk synth
```

## 🔍 Stack Details

### S3 Static Website Stack

- **Bucket**: Configured for static website hosting
- **Public Access**: Blocked except for CloudFront
- **CORS**: Enabled for API calls
- **Lifecycle**: No expiration (static content)

### CloudFront Distribution

- **Origins**: S3 bucket as origin
- **Behaviors**: Optimized for static content
- **Caching**: Long-term caching for assets
- **Compression**: Gzip/Brotli enabled
- **Security**: HTTPS redirect enforced

## 🚨 Important Notes

- The frontend must be built before deployment
- Build output goes to `website/` directory
- CloudFront distribution can take 15-20 minutes to deploy
- DNS propagation may take additional time

## 🛠️ Troubleshooting

### Common Issues

1. **Build fails**: Ensure frontend is built first
2. **Deployment timeout**: CloudFront takes time to propagate
3. **Domain not working**: Check DNS settings and certificate status

### Useful Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name NeuralynxStack

# View CloudFront distribution
aws cloudfront list-distributions

# Check S3 bucket
aws s3 ls s3://your-bucket-name
```
