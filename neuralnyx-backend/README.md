# Neuralynx Backend

A comprehensive serverless backend infrastructure built with AWS CDK, providing domain analysis, content crawling, SEO optimization, and AI-powered keyword generation capabilities.

## 🏗️ Architecture Overview

Neuralynx Backend is a sophisticated serverless application that leverages AWS services to provide:

- **User Authentication & Management** via AWS Cognito
- **Domain Analysis & Content Crawling** using Playwright and Lighthouse
- **AI-Powered Keyword Generation** via AWS Bedrock
- **Content Management** with DynamoDB and S3
- **Event-Driven Architecture** using SNS for asynchronous processing
- **RESTful API** with comprehensive OpenAPI documentation

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Lambda        │
│   Application   │◄──►│   (REST API)    │◄──►│   Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Cognito       │    │   DynamoDB      │
                       │   (Auth)        │    │   (Data Store)  │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                ┌───────────────────────┼───────────────────────┐
                                ▼                       ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                       │   S3 Buckets    │    │   SNS Topics    │    │   Bedrock       │
                       │   (File Store)  │    │   (Events)      │    │   (AI/ML)       │
                       └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Key Features

### 1. **User Authentication & Management**
- JWT-based authentication with AWS Cognito
- User registration, login, and token refresh
- Secure API endpoints with custom authorizers

### 2. **Domain Management**
- Create, read, update, and delete domains
- Domain validation and normalization
- Business summary and analysis tracking

### 3. **Content Crawling & Analysis**
- **Web Crawling**: Full website crawling using Playwright
- **Sitemap Processing**: XML sitemap parsing and URL extraction
- **Lighthouse Audits**: Performance, accessibility, SEO, and best practices scoring
- **Content Processing**: HTML to Markdown conversion with metadata extraction

### 4. **AI-Powered Features**
- **Keyword Generation**: AI-generated SEO keywords using AWS Bedrock
- **Domain Analysis**: Automated business analysis and categorization
- **Content Optimization**: AI-driven content recommendations

### 5. **Event-Driven Processing**
- Asynchronous domain processing via SNS
- Stream-based DynamoDB triggers
- Scalable background job processing

## 🛠️ Technology Stack

### **Infrastructure**
- **AWS CDK v2**: Infrastructure as Code
- **TypeScript**: Type-safe development
- **AWS Lambda**: Serverless compute
- **API Gateway**: REST API management

### **Data Storage**
- **DynamoDB**: NoSQL database with streams
- **S3**: File storage for crawl results and reports
- **SSM Parameter Store**: Configuration management

### **Authentication & Security**
- **AWS Cognito**: User management and authentication
- **JWT Tokens**: Secure API access
- **IAM Roles**: Fine-grained permissions

### **AI & Machine Learning**
- **AWS Bedrock**: AI model access (Claude, Llama)
- **Bedrock Agent**: Conversational AI capabilities

### **Web Technologies**
- **Playwright**: Browser automation and web crawling
- **Lighthouse**: Web performance auditing
- **Turndown**: HTML to Markdown conversion

### **Development & Deployment**
- **LocalStack**: Local AWS development
- **Docker**: Containerized Lambda functions
- **Jest**: Testing framework
- **Prettier**: Code formatting

## 📁 Project Structure

```
neuralynx-backend/
├── bin/                          # CDK app entry point
├── lib/                          # CDK stack definitions
│   ├── constructs/               # Reusable CDK constructs
│   │   ├── api-construct.ts      # API Gateway setup
│   │   ├── cognito-construct.ts  # Cognito configuration
│   │   ├── database-construct.ts # DynamoDB tables
│   │   ├── lambda-construct.ts   # Lambda functions
│   │   ├── container-lambda-construct.ts # Container Lambdas
│   │   ├── s3-construct.ts       # S3 buckets
│   │   └── sns-construct.ts      # SNS topics
│   └── neuralynx-backend-stack.ts # Main stack
├── lambda/                       # Lambda function code
│   ├── services/                 # Business logic services
│   │   ├── authService.ts        # Authentication logic
│   │   ├── domainService.ts      # Domain management
│   │   ├── contentService.ts     # Content processing
│   │   ├── topicService.ts       # Topic management
│   │   └── bedrockService.ts     # AI integration
│   ├── utils/                    # Utility functions
│   │   ├── awsClients.ts         # AWS SDK clients
│   │   ├── httpResponses.ts      # HTTP response helpers
│   │   └── markdownConverter.ts  # Content conversion
│   ├── cognitoTriggers/          # Cognito Lambda triggers
│   ├── *Handler.ts               # API endpoint handlers
│   └── *Handler.ts               # Background job handlers
├── models/                       # Data models
│   ├── domain.ts                 # Domain entity
│   ├── content.ts                # Content entity
│   ├── topic.ts                  # Topic entity
│   └── tableDecorator.ts         # DynamoDB decorators
├── assets/                       # Static assets
├── scripts/                      # Build and deployment scripts
├── test/                         # Test files
├── docker-compose.yml            # LocalStack configuration
├── Dockerfile.lighthouse         # Container Lambda image
├── Makefile                      # Development commands
└── package.json                  # Dependencies and scripts
```

## 🗄️ Database Schema

### **DynamoDB Tables**

#### 1. **Domain Table**
- **Partition Key**: `userId` (string)
- **Sort Key**: `domain` (string)
- **Attributes**:
  - `createdAt`, `updatedAt`: Timestamps
  - `isActive`: Boolean status
  - `businessSummary`: Optional business description
  - `lastCrawledAt`: Last crawl timestamp
  - `crawlResults`: S3 metadata for crawl data
  - `sitemapResults`: Sitemap processing results
  - `lighthouseResults`: Performance audit results
  - `businessAnalysis`: AI-generated business insights

#### 2. **Content Table**
- **Partition Key**: `domain` (string)
- **Sort Key**: `url` (string)
- **Attributes**:
  - `userId`: Content owner
  - `crawlData`: Web crawling results
  - `markdownData`: Converted markdown content
  - `lighthouseData`: Performance metrics

#### 3. **Topics Table**
- **Partition Key**: `id` (string)
- **Sort Key**: `domain` (string)
- **GSI**: `DomainIndex` for querying by domain
- **Attributes**:
  - `value`: Topic content
  - `userId`: Topic owner
  - `createdAt`, `updatedAt`: Timestamps

#### 4. **Keywords Table**
- **Partition Key**: `userId` (string)
- **Sort Key**: `analysisId` (string)
- **TTL**: Automatic cleanup
- **Attributes**: AI-generated keyword analysis

#### 5. **Error Logs Table**
- **Partition Key**: `userId` (string)
- **Sort Key**: `errorId` (string)
- **TTL**: Automatic cleanup
- **Attributes**: Error tracking and debugging

## 🔄 Event Flow

### **Domain Creation Flow**
1. User creates domain via API
2. Domain stored in DynamoDB
3. DynamoDB stream triggers domain stream handler
4. Stream handler publishes SNS event
5. Multiple handlers process domain asynchronously:
   - Domain crawler (Playwright)
   - Sitemap crawler
   - Lighthouse auditor
   - Bedrock domain analyzer

### **Content Processing Flow**
1. Domain crawler extracts web content
2. Content stored in S3 with metadata in DynamoDB
3. Markdown conversion service processes HTML
4. Lighthouse audits performance metrics
5. Results aggregated and stored

## 🚀 Getting Started

### **Prerequisites**
- Node.js 20.x
- AWS CLI configured
- Docker (for LocalStack)
- CDK CLI

### **Local Development Setup**

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd neuralynx-backend
   npm install
   ```

2. **Start LocalStack**
   ```bash
   docker-compose up -d
   ```

3. **Deploy to LocalStack**
   ```bash
   make install
   make deploy
   ```

4. **Check Deployment**
   ```bash
   make outputs
   make check-ssm
   ```

### **Available Make Commands**
- `make install` - Install dependencies
- `make deploy` - Deploy to LocalStack
- `make ready` - Check LocalStack status
- `make outputs` - Show stack outputs
- `make logs` - Save LocalStack logs
- `make destroy` - Destroy stack
- `make clean` - Clean up files
- `make test` - Run tests

## 🌐 API Endpoints

### **Authentication**
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh

### **Domain Management**
- `GET /domains` - List user domains
- `POST /domains` - Create new domain
- `DELETE /domains/{domain}` - Delete domain

### **Content Operations**
- `POST /content` - Get content by URL
- `POST /content/list` - List domain content
- `POST /content/delete` - Delete content

### **Analysis & Processing**
- `POST /sitemap` - Crawl sitemap
- `POST /lighthouse` - Run Lighthouse audit
- `POST /keywords` - Generate AI keywords
- `POST /bedrock-agent` - AI agent interaction

### **Topic Management**
- `GET /topics` - List user topics
- `POST /topics` - Create topic
- `GET /topics/{domain}` - Get domain topics
- `PUT /topics/{domain}/{id}` - Update topic
- `DELETE /topics/{domain}/{id}` - Delete topic

### **System**
- `GET /health` - Health check
- `GET /docs` - API documentation
- `GET /swagger.json` - OpenAPI specification

## 🔧 Configuration

### **Environment Variables**
- `LOCALSTACK_ENDPOINT`: LocalStack endpoint URL
- `DOMAIN_TABLE_NAME`: DynamoDB domain table
- `CONTENT_TABLE_NAME`: DynamoDB content table
- `TOPICS_TABLE_NAME`: DynamoDB topics table
- `DOMAIN_EVENTS_TOPIC_ARN`: SNS topic for events

### **AWS Services Configuration**
- **Region**: ap-southeast-1 (configurable)
- **Cognito**: User pool with email verification
- **DynamoDB**: Pay-per-request billing
- **Lambda**: ARM64 architecture, 1GB memory
- **S3**: Private buckets with lifecycle policies

## 🧪 Testing

### **Run Tests**
```bash
npm test
```

### **Test Coverage**
- Unit tests for services
- Integration tests for API endpoints
- Mock AWS services for local testing

## 📊 Monitoring & Logging

### **CloudWatch Integration**
- Lambda function logs
- API Gateway access logs
- DynamoDB metrics
- SNS delivery status

### **Error Handling**
- Structured error responses
- Error logging to DynamoDB
- Automatic retry mechanisms
- Dead letter queues for failed messages

## 🔒 Security

### **Authentication**
- JWT tokens with expiration
- Refresh token rotation
- Secure password policies
- Email verification

### **Authorization**
- Custom API Gateway authorizers
- IAM role-based access control
- Resource-level permissions
- CORS configuration

### **Data Protection**
- Encryption at rest (DynamoDB, S3)
- Encryption in transit (HTTPS)
- Secure parameter storage
- VPC endpoints (optional)

## 🚀 Deployment

### **AWS Deployment**
```bash
# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy to AWS
cdk deploy --context environment=production
```

### **Environment Configuration**
- `local`: LocalStack development
- `staging`: AWS staging environment
- `production`: AWS production environment

## 📈 Performance & Scaling

### **Auto-scaling Features**
- DynamoDB auto-scaling
- Lambda concurrency limits
- S3 transfer acceleration
- CloudFront distribution (optional)

### **Optimization**
- ARM64 Lambda architecture
- Container image caching
- S3 presigned URLs
- DynamoDB batch operations

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run `make test` and `make format:check`
5. Submit pull request

### **Code Standards**
- TypeScript strict mode
- Prettier formatting
- ESLint configuration
- Comprehensive error handling

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### **Documentation**
- API documentation: `/docs` endpoint
- OpenAPI spec: `/swagger.json`
- Architecture diagrams: `diagram.png`

### **Troubleshooting**
- Check LocalStack logs: `make logs`
- Verify SSM parameters: `make check-ssm`
- Review CloudWatch logs in AWS
- Check DynamoDB streams and SNS topics

---

**Built with ❤️ using AWS CDK, TypeScript, and modern serverless architecture.**