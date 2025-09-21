import { pipeline, env } from "@xenova/transformers";

// Configure environment for Chrome extension compatibility
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;
// Disable web workers to avoid CSP issues with blob URLs
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = true;

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

export interface TopicScore {
  topic: string;
  score: number;
  relevance: number;
  embedding?: number[];
}

export interface ContentAnalysis {
  overallScore: number;
  topicScores: TopicScore[];
  contentQuality: {
    titleScore: number;
    metaDescriptionScore: number;
    contentRelevance: number;
    keywordDensity: number;
  };
  recommendations: string[];
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private model: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log("Initializing embedding model...");
      this.model = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        {
          quantized: false,
        }
      );
      this.isInitialized = true;
      console.log("Embedding model initialized successfully");
    } catch (error) {
      console.error("Failed to initialize embedding model:", error);
      this.initializationPromise = null;
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Clean and prepare text
      const cleanedText = this.cleanText(text);

      // Generate embedding
      const result = await this.model(cleanedText, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = Array.from(result.data) as number[];

      // Estimate token count (rough approximation for this model)
      const estimatedTokens = Math.ceil(cleanedText.split(/\s+/).length * 1.3);

      return {
        embedding,
        text: cleanedText,
        tokens: estimatedTokens,
      };
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (const text of texts) {
      try {
        const result = await this.generateEmbedding(text);
        results.push(result);
      } catch (error) {
        console.error(
          `Error generating embedding for text: ${text.substring(0, 50)}...`,
          error
        );
        // Continue with other texts
      }
    }

    return results;
  }

  private cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?-]/g, "") // Remove special characters except basic punctuation
      .substring(0, 512); // Limit text length for performance
  }

  async extractPageContent(): Promise<string> {
    // Since we're using side panel only, we'll return a placeholder
    // In a real implementation, you might want to:
    // 1. Use the browser.tabs API to get the current tab
    // 2. Inject a content script to extract page content
    // 3. Or use a different approach for content extraction

    return "Sample page content for analysis. This would be replaced with actual page content extraction in a full implementation.";
  }

  // Calculate cosine similarity between two embeddings
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Analyze content and topics to generate scores
  async analyzeContent(
    title: string,
    metaDescription: string,
    content: string,
    topics: string[]
  ): Promise<ContentAnalysis> {
    try {
      // Generate embeddings for all content pieces
      const [titleEmbedding, metaEmbedding, contentEmbedding] =
        await Promise.all([
          this.generateEmbedding(title),
          this.generateEmbedding(metaDescription),
          this.generateEmbedding(content),
        ]);

      // Generate embeddings for topics
      const topicEmbeddings = await this.generateEmbeddings(topics);

      // Calculate topic scores based on similarity to content
      const topicScores: TopicScore[] = topics.map((topic, index) => {
        const topicEmbedding = topicEmbeddings[index];
        if (!topicEmbedding) {
          return {
            topic: topic,
            score: 0,
            relevance: 0,
            embedding: [],
          };
        }

        // Calculate similarity to content
        const contentSimilarity = this.cosineSimilarity(
          topicEmbedding.embedding,
          contentEmbedding.embedding
        );

        // Calculate similarity to title
        const titleSimilarity = this.cosineSimilarity(
          topicEmbedding.embedding,
          titleEmbedding.embedding
        );

        // Calculate similarity to meta description
        const metaSimilarity = this.cosineSimilarity(
          topicEmbedding.embedding,
          metaEmbedding.embedding
        );

        // Weighted relevance score
        const relevance =
          contentSimilarity * 0.6 +
          titleSimilarity * 0.3 +
          metaSimilarity * 0.1;

        // Convert to 0-100 score
        const score = Math.max(0, Math.min(100, Math.round(relevance * 100)));

        return {
          topic,
          score,
          relevance,
          embedding: topicEmbedding.embedding,
        };
      });

      // Calculate content quality metrics
      const contentQuality = this.calculateContentQuality(
        title,
        metaDescription,
        content,
        topicScores
      );

      // Calculate overall score
      const overallScore = this.calculateOverallScore(
        topicScores,
        contentQuality
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        topicScores,
        contentQuality
      );

      return {
        overallScore,
        topicScores,
        contentQuality,
        recommendations,
      };
    } catch (error) {
      console.error("Error analyzing content:", error);
      throw error;
    }
  }

  private calculateContentQuality(
    title: string,
    metaDescription: string,
    content: string,
    topicScores: TopicScore[]
  ) {
    // Title score based on length and keyword presence
    const titleScore = Math.min(
      100,
      Math.max(
        0,
        (title.length >= 30 && title.length <= 60 ? 20 : 0) +
          (title.toLowerCase().includes("how") ||
          title.toLowerCase().includes("what") ||
          title.toLowerCase().includes("why")
            ? 20
            : 0) +
          (topicScores.some((t) =>
            title.toLowerCase().includes(t.topic.toLowerCase())
          )
            ? 30
            : 0) +
          (title.length > 0 ? 30 : 0)
      )
    );

    // Meta description score
    const metaScore = Math.min(
      100,
      Math.max(
        0,
        (metaDescription.length >= 120 && metaDescription.length <= 160
          ? 30
          : 0) +
          (metaDescription.length > 0 ? 40 : 0) +
          (topicScores.some((t) =>
            metaDescription.toLowerCase().includes(t.topic.toLowerCase())
          )
            ? 30
            : 0)
      )
    );

    // Content relevance (based on topic coverage)
    const avgTopicScore =
      topicScores.length > 0
        ? topicScores.reduce((sum, t) => sum + t.score, 0) / topicScores.length
        : 0;
    const contentRelevance = Math.round(avgTopicScore);

    // Keyword density (simplified)
    const wordCount = content.split(/\s+/).length;
    const keywordCount = topicScores.reduce((count, topic) => {
      const regex = new RegExp(topic.topic.toLowerCase(), "gi");
      const matches = content.toLowerCase().match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    const keywordDensity =
      wordCount > 0 ? Math.min(100, (keywordCount / wordCount) * 1000) : 0;

    return {
      titleScore,
      metaDescriptionScore: metaScore,
      contentRelevance,
      keywordDensity: Math.round(keywordDensity),
    };
  }

  private calculateOverallScore(
    topicScores: TopicScore[],
    contentQuality: {
      titleScore: number;
      metaDescriptionScore: number;
      contentRelevance: number;
      keywordDensity: number;
    }
  ): number {
    const avgTopicScore =
      topicScores.length > 0
        ? topicScores.reduce((sum, t) => sum + t.score, 0) / topicScores.length
        : 0;

    const weightedScore =
      avgTopicScore * 0.4 +
      contentQuality.titleScore * 0.2 +
      contentQuality.metaDescriptionScore * 0.2 +
      contentQuality.contentRelevance * 0.15 +
      Math.min(100, contentQuality.keywordDensity) * 0.05;

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  private generateRecommendations(
    topicScores: TopicScore[],
    contentQuality: {
      titleScore: number;
      metaDescriptionScore: number;
      contentRelevance: number;
      keywordDensity: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    // Topic-based recommendations
    const lowScoreTopics = topicScores.filter((t) => t.score < 50);
    if (lowScoreTopics.length > 0) {
      recommendations.push(
        `Improve relevance for topics: ${lowScoreTopics
          .map((t) => t.topic)
          .join(", ")}`
      );
    }

    // Title recommendations
    if (contentQuality.titleScore < 70) {
      if (contentQuality.titleScore < 30) {
        recommendations.push(
          "Add a compelling title that includes your main keywords"
        );
      } else {
        recommendations.push(
          "Optimize title length (30-60 characters) and include question format"
        );
      }
    }

    // Meta description recommendations
    if (contentQuality.metaDescriptionScore < 70) {
      if (contentQuality.metaDescriptionScore < 30) {
        recommendations.push("Add a meta description (120-160 characters)");
      } else {
        recommendations.push(
          "Optimize meta description length and include call-to-action"
        );
      }
    }

    // Content recommendations
    if (contentQuality.keywordDensity < 10) {
      recommendations.push(
        "Increase keyword density naturally throughout the content"
      );
    }

    if (contentQuality.contentRelevance < 60) {
      recommendations.push("Improve content relevance to your target topics");
    }

    return recommendations;
  }
}
