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
class BusinessQueryInput(BaseModel):
    summary: str
    goals: str
    existingKeywords: str
    domain: str

class UserQueriesOutput(BaseModel):
    queries: List[str]

logger.debug("Initializing business query generation agent")
agent = Agent(
    name="BusinessQueryGenerator",
    instructions="""You are an expert in generating user queries that help businesses appear in ChatGPT and other LLM results.

You will receive:
- BUSINESS SUMMARY: What the company does, key products/services, target audience, and differentiators
- GOALS: The business goal (e.g., appear in ChatGPT/LLM results for relevant searches, expand keyword coverage, capture high-intent queries)
- EXISTING KEYWORDS: List of phrases the business already targets
- DOMAIN: The business domain name

INSTRUCTIONS: Generate exactly 10 new example user queries that potential customers might ask ChatGPT or other LLMs, where this business should appear as a recommended solution.

Guidelines:
- Queries must reflect realistic user intent (discovery, comparison, integrations, solving pain points)
- Cover different intent categories:
  - Discovery (e.g., "What is the best [solution/product]?")
  - Comparison (e.g., "[Business Name] vs [Competitor] for [use case]")
  - Integration (e.g., "How to connect [Business Name] with [popular tool]?")
  - Use Case (e.g., "How can [audience] use [Business Name] to [achieve goal]?")
- Keep queries natural, diverse, and conversational (like what real users type)
- Do NOT duplicate the existing keywords provided
- Focus on queries that would lead users to discover this specific business
- Make queries specific enough to be actionable but broad enough to capture various user intents

Generate exactly 10 unique user queries that would help this business appear in LLM search results.""",
    tools=[
        WebSearchTool(),
    ],
    output_type=UserQueriesOutput,
)

async def main(business_data=None):
    if business_data is None:
        business_data = {
            "summary": "A sample business that provides services",
            "goals": "Appear in ChatGPT/LLM results for relevant searches",
            "existingKeywords": "business services, consulting",
            "domain": "example.com"
        }
    
    # Format the query for business query generation
    query = f"""BUSINESS SUMMARY: {business_data.get('summary', '')}

GOALS: {business_data.get('goals', '')}

EXISTING KEYWORDS: {business_data.get('existingKeywords', '')}

DOMAIN: {business_data.get('domain', '')}

Please generate 10 new user queries that would help this business appear in LLM search results."""
    
    logger.debug(f"Running business query generation for domain: {business_data.get('domain', 'unknown')}")
    
    try:
        logger.debug("Starting agent execution")
        result = await Runner.run(agent, query)
        logger.debug(f"Agent execution completed with result type: {type(result)}")
        
        # The output_type automatically validates and parses the JSON
        # result.final_output will be a UserQueriesOutput object
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
    
    # Extract business data from payload
    business_data = {
        "summary": payload.get("summary", ""),
        "goals": payload.get("goals", ""),
        "existingKeywords": payload.get("existingKeywords", ""),
        "domain": payload.get("domain", "example.com")
    }
    
    try:
        result = await main(business_data)
        logger.debug("Agent execution completed successfully")
        # Convert Pydantic model to dict for JSON serialization
        if hasattr(result, 'model_dump'):
            return {"result": result.model_dump()}
        else:
            return {"result": result}
            
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        return {"result": {"queries": ["error", "occurred", "during", "execution", "check", "logs", "for", "details", "about", "failure"]}}

# Run the app when imported
if __name__== "__main__":
    app.run()
