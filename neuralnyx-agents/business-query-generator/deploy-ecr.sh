#!/bin/bash

# Deploy Python OpenAI AgentCore to Amazon ECR
# Based on AWS Bedrock AgentCore samples pattern

set -e

# Configuration
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPOSITORY_NAME="openai-agentcore-python"
IMAGE_TAG="latest"
FUNCTION_NAME="openai-agentcore-python"

echo "🐍 Deploying Python OpenAI AgentCore to Amazon ECR..."
echo "📍 Region: $REGION"
echo "👤 Account: $ACCOUNT_ID"

IMAGE_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG"

echo "🏷️  Image: $IMAGE_URI"

# Build the Python application
echo "📦 Preparing Python application..."

# Create ECR repository if it doesn't exist
echo "🏗️  Creating ECR repository (if it doesn't exist)..."
aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION >/dev/null 2>&1 || \
aws ecr create-repository \
    --repository-name $REPOSITORY_NAME \
    --region $REGION \
    --image-scanning-configuration scanOnPush=true

echo "✅ ECR repository ready: $REPOSITORY_NAME"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $REPOSITORY_NAME:$IMAGE_TAG .

# Tag image for ECR
echo "🏷️  Tagging image for ECR..."
docker tag $REPOSITORY_NAME:$IMAGE_TAG $IMAGE_URI

# Push image to ECR
echo "📤 Pushing image to ECR..."
docker push $IMAGE_URI

echo "✅ Successfully deployed to ECR!"
echo "📋 Image URI: $IMAGE_URI"

# Create ECS task definition
echo "📝 Creating ECS task definition..."
cat > task-definition.json << EOF
{
  "family": "$FUNCTION_NAME-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "$FUNCTION_NAME-container",
      "image": "$IMAGE_URI",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$FUNCTION_NAME",
          "awslogs-region": "$REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "OPENAI_API_KEY",
          "value": "$OPENAI_API_KEY"
        },
        {
          "name": "OPENAI_MODEL",
          "value": "$OPENAI_MODEL"
        }
      ]
    }
  ]
}
EOF

echo "📋 ECS Task Definition created: task-definition.json"

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group \
    --log-group-name "/ecs/$FUNCTION_NAME" \
    --region $REGION 2>/dev/null || echo "Log group already exists"

# Register ECS task definition
echo "📝 Registering ECS task definition..."
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://task-definition.json \
    --region $REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ ECS Task Definition registered: $TASK_DEFINITION_ARN"

# Clean up
rm -f task-definition.json

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Create an ECS cluster (if you don't have one):"
echo "   aws ecs create-cluster --cluster-name $FUNCTION_NAME-cluster --region $REGION"
echo ""
echo "2. Create a service to run your task:"
echo "   aws ecs create-service \\"
echo "     --cluster $FUNCTION_NAME-cluster \\"
echo "     --service-name $FUNCTION_NAME-service \\"
echo "     --task-definition $FUNCTION_NAME-task \\"
echo "     --desired-count 1 \\"
echo "     --launch-type FARGATE \\"
echo "     --network-configuration \"awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}\" \\"
echo "     --region $REGION"
echo ""
echo "3. Or use the image in Bedrock AgentCore:"
echo "   - Go to AWS Bedrock Console"
echo "   - Create a new agent"
echo "   - Use image: $IMAGE_URI"
echo ""
echo "🔗 Useful Commands:"
echo "   - View logs: aws logs tail /ecs/$FUNCTION_NAME --follow --region $REGION"
echo "   - List images: aws ecr list-images --repository-name $REPOSITORY_NAME --region $REGION"
echo "   - Delete image: aws ecr batch-delete-image --repository-name $REPOSITORY_NAME --image-ids imageTag=$IMAGE_TAG --region $REGION"
echo ""
echo "🧪 Test locally:"
echo "   python app.py"