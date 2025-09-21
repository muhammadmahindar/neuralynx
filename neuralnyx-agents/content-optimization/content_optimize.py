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
class ContentOptimizationInput(BaseModel):
    content: str
    title: str
    meta: str
    topics: List[str]

class OptimizedContentOutput(BaseModel):
    content: str

logger.debug("Initializing content optimization agent")
agent = Agent(
    name="ContentOptimizationAgent",
    instructions="""You are an expert content writer and SEO specialist who specializes in optimizing blog posts for better readability, engagement, and search engine performance.

Your task is to optimize the provided blog post content by:
1. Improving readability and flow while maintaining the original message
2. Enhancing engagement through better structure and compelling language
3. Optimizing for SEO while keeping content natural and valuable
4. Ensuring the content aligns with the provided title, meta description, and topics
5. Maintaining the original tone and voice of the content

INSTRUCTIONS:
- Analyze the provided content, title, meta description, and topics
- If you encounter topics or concepts you're not fully familiar with, use web search to research current information, trends, and best practices
- Improve sentence structure and paragraph flow for better readability
- Enhance engagement with compelling headlines, subheadings, and transitions
- Optimize keyword placement naturally throughout the content
- Ensure the content delivers value and maintains reader interest
- Keep the optimized content comprehensive and informative
- Maintain the original length or expand slightly if it adds value
- Use active voice and clear, concise language
- Add relevant subheadings to improve structure and scannability
- Research current industry standards and best practices for the topics when needed

OUTPUT FORMAT:
Return ONLY the optimized content as a single string in MARKDOWN format. Do not include the title, meta description, or any other fields. Just return the pure optimized content that:
- Is well-structured with proper markdown headings (# ## ###) and subheadings
- Uses markdown formatting for emphasis (**bold**, *italic*), lists, and other elements
- Flows naturally from introduction to conclusion
- Incorporates the provided topics naturally
- Is optimized for both readers and search engines
- Maintains the original message while improving presentation
- Uses proper markdown syntax throughout (headings, lists, emphasis, links, etc.)

Focus on creating content that is engaging, informative, and optimized for both human readers and search engines, formatted in clean markdown.""",
    tools=[ WebSearchTool()],
    output_type=OptimizedContentOutput,
)

async def main(content_data=None):
    if content_data is None:
        content_data = {
            "content": "Sample blog content to optimize",
            "title": "Sample Title",
            "meta": "Sample meta description",
            "topics": ["sample", "topic"]
        }
    
    # Format the query for content optimization
    query = f"""Please optimize the following blog post content:

TITLE: {content_data.get('title', '')}
META DESCRIPTION: {content_data.get('meta', '')}
TOPICS: {', '.join(content_data.get('topics', []))}

CONTENT TO OPTIMIZE:
{content_data.get('content', '')}

Please optimize this content for better readability, engagement, and SEO while maintaining the original message and tone. Focus on improving structure, flow, and incorporating the provided topics naturally throughout the content.

IMPORTANT: Return the optimized content in MARKDOWN format with proper headings (# ## ###), emphasis (**bold**, *italic*), lists, and other markdown elements for better structure and readability.

If you need additional information about any of the topics or want to ensure you're using the most current and accurate information, feel free to use web search to research the topics and enhance the content accordingly."""
    
    logger.debug(f"Running content optimization for title: {content_data.get('title', 'Untitled')}")
    
    try:
        logger.debug("Starting agent execution")
        result = await Runner.run(agent, query)
        logger.debug(f"Agent execution completed with result type: {type(result)}")
        
        # The output_type automatically validates and parses the JSON
        # result.final_output will be an OptimizedContentOutput object
        logger.debug(f"Parsed output: {result.final_output}")
        # Return just the content string, not the full object
        return result.final_output.content
        
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        raise

# Integration with Bedrock AgentCore
from bedrock_agentcore.runtime import BedrockAgentCoreApp
app = BedrockAgentCoreApp()

@app.entrypoint
async def agent_invocation(payload, context):
    logger.debug(f"Received payload: {payload}")
    
    # Extract content data from payload
    content_data = {
        "content": payload.get("content", ""),
        "title": payload.get("title", ""),
        "meta": payload.get("meta", ""),
        "topics": payload.get("topics", [])
    }
    
    try:
        result = await main(content_data)
        logger.debug("Agent execution completed successfully")
        # Return just the optimized content string directly
        return {"result": result}
            
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        return {"result": "Error occurred during content optimization. Please try again."}

# Run the app when imported
if __name__== "__main__":
    app.run()
