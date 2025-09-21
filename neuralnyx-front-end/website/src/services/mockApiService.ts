import type {
  BusinessSummaryRequest,
  BusinessSummaryResponse,
  ContentTopicsRequest,
  ContentTopicsResponse,
} from "@/types/onboarding";

/**
 * Mock API service for onboarding endpoints
 * This simulates API calls with realistic delays and responses
 */

export const mockApiService = {
  /**
   * Generate business summary based on domain
   */
  async generateBusinessSummary(
    request: BusinessSummaryRequest
  ): Promise<BusinessSummaryResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { domain } = request;

    // Extract domain name for more personalized response
    const domainName = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    const mockSummary = `Based on your domain ${domain}, here's a comprehensive business summary:

**Company Overview:**
${domainName} appears to be a forward-thinking digital business focused on innovation and modern solutions. The domain suggests a strong online presence and commitment to digital-first approaches in today's competitive market.

**Key Business Areas:**
- Digital innovation and technology solutions
- Online service delivery and customer engagement
- Modern business practices and digital transformation
- Web-based platform development and management

**Market Position:**
Your company is positioned to serve customers who value digital-first approaches and innovative solutions. The combination of your domain and business model indicates a forward-thinking organization ready to meet modern market demands and adapt to changing consumer expectations.

**Growth Opportunities:**
- Expand digital service offerings and online capabilities
- Enhance customer experience through technology integration
- Leverage data analytics for operational efficiency
- Develop strategic partnerships in the digital ecosystem
- Implement scalable solutions for business growth

**Technology Focus:**
- Modern web technologies and platforms
- Cloud-based solutions and infrastructure
- Mobile-first design and development
- Data-driven decision making processes

This summary can be customized further based on your specific industry focus, target market, and business objectives.`;

    return {
      summary: mockSummary,
    };
  },

  /**
   * Generate additional business insights
   */
  async generateBusinessInsights(): Promise<{ insights: string }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const additionalInsights = `

**Additional Business Insights:**
- Market analysis suggests strong growth potential in your sector
- Customer acquisition strategies should focus on digital channels
- Consider implementing data-driven decision making processes
- Partnership opportunities identified in complementary industries
- SEO and content marketing strategies can drive organic growth
- Social media presence can enhance brand visibility

**Recommended Next Steps:**
1. Develop a comprehensive digital marketing strategy
2. Implement customer relationship management systems
3. Establish key performance indicators (KPIs) for growth tracking
4. Consider expanding service offerings based on market demand
5. Invest in analytics and reporting tools
6. Build strategic partnerships in your industry

**Competitive Advantages:**
- Strong digital presence and modern approach
- Scalable technology infrastructure
- Data-driven business model
- Customer-centric service delivery

**Risk Mitigation:**
- Diversify revenue streams
- Maintain up-to-date security measures
- Monitor market trends and adapt accordingly
- Build strong customer relationships`;

    return {
      insights: additionalInsights,
    };
  },

  /**
   * Generate content strategy prompts based on domain and business summary
   */
  async generateContentTopics(
    request: ContentTopicsRequest
  ): Promise<ContentTopicsResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const { domain, businessSummary } = request;
    const domainName = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    const mockPrompts = [
      `Write a comprehensive guide about digital transformation strategies for ${domainName}, covering modern technologies, implementation challenges, and success metrics.`,
      `Create an in-depth article on customer experience optimization for ${domainName}, including user journey mapping, pain point analysis, and improvement strategies.`,
      `Develop a detailed piece about data-driven decision making for ${domainName}, focusing on analytics tools, KPI selection, and business intelligence implementation.`,
      `Write about emerging technology trends relevant to ${domainName}'s industry, including AI, automation, and digital innovation opportunities.`,
      `Create a comprehensive digital marketing strategy guide for ${domainName}, covering SEO, content marketing, social media, and conversion optimization.`,
      `Develop content about remote work and collaboration best practices for ${domainName}, including team management, productivity tools, and culture building.`,
      `Write about cybersecurity and data protection strategies for ${domainName}, covering threat prevention, compliance requirements, and security best practices.`,
      `Create a guide on scalable business growth strategies for ${domainName}, including market expansion, operational efficiency, and sustainable scaling.`,
      `Develop content about industry-specific challenges and solutions for ${domainName}, addressing common pain points and innovative approaches.`,
      `Write about customer retention and loyalty strategies for ${domainName}, including engagement tactics, feedback systems, and long-term relationship building.`,
    ];

    return {
      topics: mockPrompts,
    };
  },
};
