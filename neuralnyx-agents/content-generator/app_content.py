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
class ContentGenerationInput(BaseModel):
    topics: List[str]
    platform: str

class ContentOutput(BaseModel):
    content: List[str]
    platform: str
    topics_covered: List[str]
    content_type: str

logger.debug("Initializing content generation agent")
agent = Agent(
    name="ContentGenerator",
    instructions="""You are an expert content creator who specializes in generating engaging, platform-specific content for various social media and content platforms.

You will receive:
- TOPICS: An array of topics to create content about
- PLATFORM: The target platform (e.g., "reddit", "twitter", "linkedin", "instagram", "tiktok", "youtube", "blog")

INSTRUCTIONS: Generate high-quality, platform-optimized content for the provided topics array.

Platform-Specific Guidelines:

REDDIT:
- Create engaging posts that encourage discussion
- Use appropriate subreddit-style formatting
- Include relevant questions to spark conversation
- Keep tone conversational and authentic
- Use bullet points or numbered lists when appropriate

TWITTER/X:
- Create tweet threads (1-5 tweets per topic)
- Use hashtags strategically
- Keep individual tweets under character limits
- Make content shareable and engaging
- Include calls-to-action

LINKEDIN:
- Create professional, thought-leadership style content
- Focus on industry insights and professional value
- Use professional tone but remain engaging
- Include relevant business hashtags
- Structure with clear headings and bullet points

INSTAGRAM:
- Create engaging captions with relevant hashtags
- Include emojis and visual language
- Use storytelling approach
- Include calls-to-action for engagement
- Keep captions engaging but not too long

TIKTOK:
- Create script-style content for short videos
- Use trending language and hooks
- Include clear beginning, middle, and end
- Make content shareable and entertaining
- Use bullet points for easy reading

YOUTUBE:
- Create video script outlines
- Include engaging hooks and calls-to-action
- Structure with clear sections
- Include viewer engagement prompts
- Make content educational or entertaining

BLOG:
- Create comprehensive, SEO-friendly content
- Use proper heading structure
- Include relevant keywords naturally
- Make content valuable and informative
- Include calls-to-action

OUTPUT FORMAT:
Generate 2-3 pieces of content for the provided topics, optimized for the specified platform. Return:
- content: List of generated content pieces
- platform: The target platform
- topics_covered: List of topics that were covered
- content_type: The type of content generated (e.g., "reddit_posts", "tweet_threads", "linkedin_posts", etc.)

Make sure each piece of content is:
- Platform-appropriate in tone and format
- Engaging and shareable
- Relevant to the topic
- Optimized for the target audience
- Ready to publish""",
    tools=[
        WebSearchTool(),
    ],
    output_type=ContentOutput,
)

async def main(content_data=None):
    if content_data is None:
        content_data = {
            "topics": ["artificial intelligence", "sustainable technology"],
            "platform": "reddit"
        }

    # Format the query for content generation
    topics = content_data.get('topics', [])
    platform = content_data.get('platform', 'reddit')
    
    query = f"""TOPICS: {topics}

PLATFORM: {platform}

Please generate engaging, platform-optimized content for the provided topics. Make sure the content is:
- Appropriate for the {platform} platform
- Engaging and shareable
- Relevant to the topics provided
- Ready to publish

Generate 2-3 pieces of content for the topics, optimized for {platform}."""

    logger.debug(f"Running content generation for platform: {platform}, topics: {topics}")

    try:
        logger.debug("Starting agent execution")
        result = await Runner.run(agent, query)
        logger.debug(f"Agent execution completed with result type: {type(result)}")

        # The output_type automatically validates and parses the JSON
        # result.final_output will be a ContentOutput object
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
    
    # Extract content data from payload - handle both direct format and prompt format
    if isinstance(payload, dict):
        if "topics" in payload and "platform" in payload:
            # Direct content generation request
            content_data = {
                "topics": payload.get("topics", []),
                "platform": payload.get("platform", "reddit")
            }
        else:
            # Prompt-based request (from console) - extract topics from prompt
            prompt = payload.get("prompt", payload.get("domain", "technology"))
            # Simple topic extraction
            if "ai" in prompt.lower() or "artificial intelligence" in prompt.lower():
                topics = ["artificial intelligence"]
            elif "sustainable" in prompt.lower() or "green" in prompt.lower():
                topics = ["sustainable technology"]
            else:
                topics = ["technology", "innovation"]
            
            content_data = {
                "topics": topics,
                "platform": "reddit"
            }
    else:
        # Fallback for non-dict payloads
        content_data = {
            "topics": ["technology", "innovation"],
            "platform": "reddit"
        }
    
    try:
        result = await main(content_data)
        logger.debug("Agent execution completed successfully")
        # Convert Pydantic model to dict for JSON serialization
        if hasattr(result, 'model_dump'):
            return {"result": result.model_dump()}
        else:
            return {"result": result}
            
    except Exception as e:
        logger.error(f"Error during agent execution: {e}", exc_info=True)
        return {"result": {"content": ["Error occurred during content generation"], "platform": "unknown", "topics_covered": [], "content_type": "error"}}

# Run the app when imported
if __name__ == "__main__":
    app.run()
