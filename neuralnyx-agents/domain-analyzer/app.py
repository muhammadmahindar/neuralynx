from agents import Agent, Runner, WebSearchTool
from pydantic import BaseModel
from typing import List
import logging
import asyncio
import sys
import json

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("openai_agents")

# Configure OpenAI library logging
logging.getLogger("openai").setLevel(logging.DEBUG)

# Define the input and output schemas using Pydantic
class DomainAnalysisInput(BaseModel):
    domain: str

class BusinessSummaryOutput(BaseModel):
    summary: str
    business_type: str
    target_audience: str
    key_services: List[str]
    industry: str

logger.debug("Initializing domain analysis agent")
agent = Agent(
    name="DomainAnalysisAgent",
    instructions="""You are an expert business analyst who specializes in understanding and analyzing businesses based on their domain names and web presence.

Your task is to analyze a given domain and generate a comprehensive business summary by:
1. Using web search to research the domain and understand what the business does
2. Analyzing the business model, services, and target audience
3. Identifying the industry and business type
4. Creating a detailed summary that reflects the actual business

INSTRUCTIONS:
- Use web search to research the provided domain thoroughly
- Look for information about the company's services, products, target audience, and business model
- Analyze the website content, about pages, service descriptions, and any available business information
- Identify the industry sector and business type
- Extract key services or products offered
- Determine the target audience based on the business model and services

OUTPUT FORMAT:
Provide a structured analysis with:
- summary: A comprehensive 2-3 sentence description of what the business does
- business_type: The type of business (e.g., "SaaS Platform", "E-commerce Store", "Consulting Firm", "Tax Services")
- target_audience: Who the business serves (e.g., "Small businesses", "Enterprise clients", "Individual consumers")
- key_services: List of main services or products offered
- industry: The primary industry sector (e.g., "Technology", "Finance", "Healthcare", "Tax Services")

Be thorough in your research and provide accurate, detailed information based on what you find through web search.""",
    tools=[
        WebSearchTool(),
    ],
    output_type=BusinessSummaryOutput,
)

async def main(domain=None):
    if domain is None:
        domain = "example.com"
    
    # Format the query for domain analysis
    query = f"""Please analyze the domain: {domain}

Use web search to research this domain thoroughly and provide a comprehensive business analysis including:
- What the business does and its main services/products
- The business type and industry
- Target audience
- Key services offered

Be thorough in your research and provide accurate information based on what you find."""
    
    logger.debug(f"Running domain analysis for: {domain}")
    
    try:
        logger.debug("Starting agent execution")
        result = await Runner.run(agent, query)
        logger.debug(f"Agent execution completed with result type: {type(result)}")
        
        # The output_type automatically validates and parses the JSON
        # result.final_output will be a BusinessSummaryOutput object
        logger.debug(f"Parsed output: {result.final_output}")
        return result.final_output
        
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        raise

# Integration with Bedrock AgentCore
from bedrock_agentcore.runtime import BedrockAgentCoreApp
app = BedrockAgentCoreApp()

@app.entrypoint
async def agent_invocation(payload, context):
    logger.debug(f"Received payload: {payload}")
    
    # Extract domain from payload
    domain = payload.get("domain", payload.get("prompt", "example.com"))
    
    try:
        result = await main(domain)
        logger.debug("Agent execution completed successfully")
        # Convert Pydantic model to dict for JSON serialization
        if hasattr(result, 'model_dump'):
            return {"result": result.model_dump()}
        else:
            return {"result": result}
            
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        return {"result": {"summary": "Error occurred during domain analysis", "business_type": "Unknown", "target_audience": "Unknown", "key_services": ["Error"], "industry": "Unknown"}}

# Run the app when imported
if __name__== "__main__":
    app.run()
