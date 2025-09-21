# Agent Core AWS Neuralynx

A comprehensive suite of AI-powered agents built on AWS Bedrock AgentCore, designed to automate business intelligence, content generation, and domain analysis tasks. This project provides four specialized agents that can be deployed independently or as a unified system.

## 🏗️ Architecture Overview

This project consists of four microservice agents, each containerized and deployable to AWS ECR/ECS:

- **Business Query Generator** - Generates user queries for LLM visibility
- **Content Generator** - Creates platform-specific content for social media
- **Content Optimizer** - Optimizes blog posts for SEO and engagement
- **Domain Analyzer** - Analyzes business domains and generates summaries

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- Docker
- AWS CLI configured
- OpenAI API key
- AWS Bedrock AgentCore access

### Environment Setup

1. Copy the environment template:
```bash
cp env.example .env
```

2. Configure your environment variables:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# AWS Configuration (optional - can use IAM roles)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=us-east-1
```

### Local Development

Each agent can be run independently:

```bash
# Business Query Generator
cd business-query-generator
python app.py

# Content Generator
cd content-generator
python app_content.py

# Content Optimizer
cd content-optimization
python content_optimize.py

# Domain Analyzer
cd domain-analyzer
python app.py
```

## 📦 Agent Details

### 1. Business Query Generator

**Purpose**: Generates user queries that help businesses appear in ChatGPT and other LLM results.

**Input Schema**:
```json
{
  "summary": "Business description",
  "goals": "Business objectives",
  "existingKeywords": "Current keyword list",
  "domain": "Business domain"
}
```

**Output Schema**:
```json
{
  "queries": ["query1", "query2", "...", "query10"]
}
```

**Features**:
- Generates exactly 10 unique user queries
- Covers discovery, comparison, integration, and use case intents
- Avoids duplicating existing keywords
- Uses web search for current market insights

### 2. Content Generator

**Purpose**: Creates engaging, platform-specific content for various social media platforms.

**Input Schema**:
```json
{
  "topics": ["topic1", "topic2"],
  "platform": "reddit|twitter|linkedin|instagram|tiktok|youtube|blog"
}
```

**Output Schema**:
```json
{
  "content": ["content1", "content2", "content3"],
  "platform": "target_platform",
  "topics_covered": ["topic1", "topic2"],
  "content_type": "platform_specific_type"
}
```

**Supported Platforms**:
- **Reddit**: Discussion-focused posts with subreddit formatting
- **Twitter/X**: Tweet threads with hashtags and CTAs
- **LinkedIn**: Professional thought-leadership content
- **Instagram**: Visual captions with emojis and storytelling
- **TikTok**: Script-style content for short videos
- **YouTube**: Video script outlines with engagement prompts
- **Blog**: SEO-friendly comprehensive content

### 3. Content Optimizer

**Purpose**: Optimizes blog posts for better readability, engagement, and SEO performance.

**Input Schema**:
```json
{
  "content": "Raw blog content",
  "title": "Blog title",
  "meta": "Meta description",
  "topics": ["topic1", "topic2", "topic3"]
}
```

**Output**: Optimized content in markdown format with:
- Improved structure and flow
- SEO-optimized keyword placement
- Enhanced readability with headings and lists
- Natural topic integration
- Proper markdown formatting

**Example Usage**:
```bash
# See content-optimization/invoke_examples.md for detailed examples
agentcore invoke --payload '{
  "content": "Your blog content here...",
  "title": "Your Blog Title",
  "meta": "Your meta description",
  "topics": ["topic1", "topic2", "topic3"]
}'
```

### 4. Domain Analyzer

**Purpose**: Analyzes business domains and generates comprehensive business summaries.

**Input Schema**:
```json
{
  "domain": "example.com"
}
```

**Output Schema**:
```json
{
  "summary": "Comprehensive business description",
  "business_type": "Type of business",
  "target_audience": "Who the business serves",
  "key_services": ["service1", "service2"],
  "industry": "Industry sector"
}
```

**Features**:
- Web search integration for accurate business analysis
- Industry classification
- Target audience identification
- Service/product extraction
- Business model analysis

## 🐳 Docker Deployment

### Build and Deploy to ECR

Each agent includes a deployment script for AWS ECR:

```bash
# Example for Business Query Generator
cd business-query-generator
chmod +x deploy-ecr.sh
./deploy-ecr.sh
```

The deployment script will:
1. Create ECR repository (if needed)
2. Build Docker image
3. Push to ECR
4. Create ECS task definition
5. Set up CloudWatch logging

### Docker Configuration

All agents use:
- **Base Image**: `ghcr.io/astral-sh/uv:python3.13-bookworm-slim`
- **Package Manager**: UV for fast Python package installation
- **Security**: Non-root user execution
- **Monitoring**: AWS OpenTelemetry instrumentation
- **Ports**: 8000 (HTTP), 8080 (metrics)

## 🔧 Dependencies

All agents share the same core dependencies:

```
openai-agents
bedrock-agentcore
bedrock-agentcore-starter-toolkit
aws-opentelemetry-distro>=0.10.1
```

## 🏃‍♂️ Running with AgentCore

### Using AgentCore CLI

```bash
# Install AgentCore CLI
pip install bedrock-agentcore

# Run any agent
agentcore invoke --payload-file sample_payload.json

# Or with inline JSON
agentcore invoke --payload '{"domain": "example.com"}'
```

### Integration with Bedrock

Each agent is designed to work seamlessly with AWS Bedrock AgentCore:

1. Deploy to ECR using the provided scripts
2. Create a Bedrock agent using the ECR image URI
3. Configure the agent with appropriate IAM roles
4. Test using the Bedrock console or API

## 📊 Monitoring and Logging

- **CloudWatch Logs**: All agents log to `/ecs/{function-name}`
- **OpenTelemetry**: Distributed tracing and metrics
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Error Handling**: Comprehensive error capture and reporting

## 🧪 Testing

### Local Testing

```bash
# Test Business Query Generator
python -c "
import asyncio
from app import main
result = asyncio.run(main({
    'summary': 'AI consulting company',
    'goals': 'Increase visibility in AI searches',
    'existingKeywords': 'AI consulting, machine learning',
    'domain': 'example.com'
}))
print(result)
"
```

### Integration Testing

Use the provided invoke examples in each agent directory:

```bash
# Content Optimization examples
cd content-optimization
cat invoke_examples.md
```

## 🔐 Security

- **IAM Roles**: Prefer IAM roles over access keys
- **Secrets Management**: Use AWS Secrets Manager for API keys
- **Network Security**: VPC configuration for production deployments
- **Container Security**: Non-root user execution
- **Image Scanning**: ECR image scanning enabled

## 📈 Scaling

### ECS Configuration

Default ECS task configuration:
- **CPU**: 256 units
- **Memory**: 512 MB
- **Launch Type**: Fargate
- **Network Mode**: awsvpc

### Auto Scaling

Configure ECS auto scaling based on:
- CPU utilization
- Memory utilization
- Request count (if using ALB)

## 🛠️ Development

### Adding New Agents

1. Create new directory with agent code
2. Copy Dockerfile template
3. Add requirements.txt
4. Implement BedrockAgentCoreApp integration
5. Add deployment script

### Code Structure

Each agent follows the same pattern:
- `app.py` or `app_content.py` - Main application file
- `requirements.txt` - Python dependencies
- `Dockerfile` - Container configuration
- `deploy-ecr.sh` - AWS deployment script

## 📝 API Reference

### Common Endpoints

All agents expose:
- `POST /` - Main agent invocation endpoint
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics

### Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the logs in CloudWatch
2. Review the invoke examples
3. Test locally first
4. Create an issue with detailed logs

## 🔄 Version History

- **v1.0.0** - Initial release with four core agents
- **v1.1.0** - Added web search integration
- **v1.2.0** - Enhanced error handling and logging
- **v1.3.0** - Added ECR deployment automation

---

**Built with ❤️ using AWS Bedrock AgentCore and OpenAI**