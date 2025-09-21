# Environment variables for LocalStack
export AWS_ACCESS_KEY_ID ?= test
export AWS_SECRET_ACCESS_KEY ?= test
export AWS_DEFAULT_REGION ?= us-east-1
export AWS_ENDPOINT_URL ?= http://127.0.0.1:4566
export AWS_ENDPOINT_URL_S3 ?= http://127.0.0.1:4566
SHELL := /bin/bash

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## Show this help
usage:
	@echo "$(GREEN)Neuralynx Backend - Available Commands:$(NC)"
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//'

## Install dependencies (LocalStack, CDK, etc.)
install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@which localstack >/dev/null || (echo "Installing LocalStack..." && pip install localstack)
	@which awslocal >/dev/null || (echo "Installing awscli-local..." && pip install awscli-local)
	@which cdklocal >/dev/null || (echo "Installing CDK..." && npm install -g aws-cdk-local aws-cdk)
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

## Deploy the stack to LocalStack
deploy:
	@echo "$(YELLOW)Deploying Neuralynx Backend to LocalStack...$(NC)"
	@test -e node_modules || (echo "Installing Node.js dependencies..." && yarn install)
	@make clean
	@rm -rf dist
	@echo "Compiling TypeScript files for container Lambda..."
	@npx tsc --project tsconfig.json --outDir dist
	@echo "Bootstrapping CDK..."
	@cdklocal bootstrap --context environment=local
	@echo "Deploying stack..."
	@cdklocal deploy --context environment=local --require-approval never --outputs-file cdk_outputs.json
	@echo "$(GREEN)Deployment completed successfully!$(NC)"



## Check if LocalStack is ready
ready:
	@echo "$(YELLOW)Checking LocalStack status...$(NC)"
	@localstack wait -t 30 && echo "$(GREEN)LocalStack is ready!$(NC)" || (echo "$(RED)LocalStack is not ready. Please start LocalStack first.$(NC)" && exit 1)

## Save LocalStack logs to file
logs:
	@echo "$(YELLOW)Saving LocalStack logs...$(NC)"
	@localstack logs > logs.txt
	@echo "$(GREEN)Logs saved to logs.txt$(NC)"

## Check SSM parameters
check-ssm:
	@echo "$(YELLOW)Checking SSM parameters...$(NC)"
	@aws ssm get-parameters --names "/neuralynx/user-pool-id" "/neuralynx/user-pool-client-id" "/neuralynx/environment" "/neuralynx/region" "/neuralynx/cognito-issuer" --endpoint-url=http://127.0.0.1:4566 --query 'Parameters[*].[Name,Value]' --output table

## Destroy the stack
destroy:
	@echo "$(YELLOW)Destroying stack...$(NC)"
	@cdklocal destroy --context environment=local --force
	@echo "$(GREEN)Stack destroyed successfully!$(NC)"

## Show stack outputs
outputs:
	@if [ -f cdk_outputs.json ]; then \
		echo "$(GREEN)Stack outputs:$(NC)"; \
		cat cdk_outputs.json; \
	else \
		echo "$(RED)No outputs file found. Run 'make deploy' first.$(NC)"; \
	fi


## Run tests
test:
	@echo "$(YELLOW)Running tests...$(NC)"
	@npm test

## Clean up generated files and destroy stack
clean:
	@echo "$(YELLOW)Cleaning up...$(NC)"
	@echo "Destroying CDK stack..."
	@cdklocal destroy --context environment=local --force 2>/dev/null || echo "No stack to destroy"
	@echo "Removing generated files..."
	@rm -f cdk_outputs.json logs.txt
	@rm -rf cdk.out dist
	@echo "Removing compiled TypeScript files..."
	@# Remove .js files that have corresponding .ts files (TypeScript compilation output)
	@for jsfile in $$(find lib bin -name "*.js" 2>/dev/null); do \
		tsfile=$${jsfile%.js}.ts; \
		if [ -f "$$tsfile" ]; then \
			rm -f "$$jsfile"; \
		fi; \
	done
	@# Remove .d.ts files that have corresponding .ts files
	@for dtsfile in $$(find lib bin -name "*.d.ts" 2>/dev/null); do \
		tsfile=$${dtsfile%.d.ts}.ts; \
		if [ -f "$$tsfile" ]; then \
			rm -f "$$dtsfile"; \
		fi; \
	done
	@echo "$(GREEN)Cleanup completed!$(NC)"

.PHONY: usage install deploy ready logs check-ssm destroy outputs test clean