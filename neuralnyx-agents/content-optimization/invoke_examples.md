# Content Optimization Agent - Invoke Examples

## Basic Invoke Command

```bash
# Using the single payload file
agentcore invoke --payload-file sample_payload.json

# Or with inline JSON
agentcore invoke --payload '{
  "content": "Your blog content here...",
  "title": "Your Blog Title",
  "meta": "Your meta description",
  "topics": ["topic1", "topic2", "topic3"]
}'
```

## Sample Payloads

### AI Business Content
```json
{
  "content": "Artificial intelligence is transforming the way businesses operate...",
  "title": "How AI is Revolutionizing Business Operations in 2024",
  "meta": "Discover how artificial intelligence is transforming business operations...",
  "topics": [
    "artificial intelligence",
    "business automation", 
    "machine learning",
    "digital transformation",
    "AI implementation",
    "business technology"
  ]
}
```

### Health & Wellness Content
```json
{
  "content": "Mental health is just as important as physical health...",
  "title": "Essential Mental Health Tips for a Balanced Life",
  "meta": "Learn practical strategies for maintaining good mental health...",
  "topics": [
    "mental health",
    "stress management",
    "wellness",
    "mindfulness",
    "therapy",
    "self-care"
  ]
}
```

### Tech Tutorial Content
```json
{
  "content": "Docker containers have revolutionized software development...",
  "title": "Getting Started with Docker: A Complete Beginner's Guide", 
  "meta": "Learn Docker basics from scratch. This comprehensive guide covers...",
  "topics": [
    "docker",
    "containerization",
    "devops",
    "software development",
    "deployment",
    "microservices"
  ]
}
```

## Expected Response Format

The agent will return only the optimized content as a markdown-formatted string:

```json
{
  "result": "# How AI is Revolutionizing Business Operations in 2024\n\nArtificial intelligence (AI) is fundamentally transforming the way businesses operate across industries. From automating routine processes to enhancing customer service and enabling **data-driven decision making**, AI technologies are reshaping the corporate landscape.\n\n## The Rise of Business Automation\n\nCompanies are increasingly leveraging AI to automate complex processes that previously required human intervention. Key benefits include:\n\n- **Improved efficiency** and reduced operational costs\n- **Enhanced accuracy** in data processing\n- **24/7 availability** for customer service\n- **Scalable solutions** that grow with business needs\n\n### Key Implementation Strategies\n\n1. **Start with pilot projects** to test AI capabilities\n2. **Invest in data quality** and infrastructure\n3. **Train employees** on AI tools and processes\n4. **Monitor and optimize** AI performance continuously\n\n[Rest of optimized content with proper markdown formatting, headings, lists, and emphasis]"
}
```

**Note**: The response contains only the optimized content string in **markdown format** - no title, meta description, or other fields are included in the output. The content will be properly formatted with headings, lists, emphasis, and other markdown elements.

## Using Different Payload Files

```bash
# Use the comprehensive examples file (extract specific payload)
agentcore invoke --payload-file sample_payloads.json --payload-key ai_business_payload

# Use individual payload files
agentcore invoke --payload-file ai_business.json
agentcore invoke --payload-file health_wellness.json
agentcore invoke --payload-file tech_tutorial.json
```

## Notes

- The `content` field should contain the raw blog post content you want to optimize
- The `title` should be the intended title of the blog post
- The `meta` field should contain the meta description for SEO
- The `topics` array should include relevant keywords and topics to incorporate naturally
- The agent will use web search if needed to research unfamiliar topics
- The response will contain the optimized content as a single string with improved structure, headings, and flow
