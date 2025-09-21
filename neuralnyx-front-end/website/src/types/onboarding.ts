// Onboarding API types
export interface OnboardingRequest {
  domain: string;
  businessSummary?: string;
}

export interface OnboardingResponse {
  id: string;
  userId: string;
  domain: string;
  createdAt: string;
}

export interface OnboardingFormData {
  domain: string;
  businessSummary: string;
  contentTopics: string[];
}

export interface BusinessSummaryRequest {
  domain: string;
}

export interface BusinessSummaryResponse {
  summary: string;
}

export interface ContentTopicsRequest {
  domain: string;
  businessSummary: string;
}

export interface ContentTopicsResponse {
  topics: string[];
}

interface LighthouseResults {
  bucket: string;
  s3Key: string;
  presignedUrl: string;
}

interface SitemapResults {
  presignedUrl: string;
  totalUrls: number;
}

interface CrawlResults {
  presignedUrl: string;
  totalPages: number;
}

export interface Domain {
  lighthouseResults: LighthouseResults;
  sitemapResults: SitemapResults;
  lastCrawledAt: string;
  domain: string;
  isActive: boolean;
  businessAnalysis: string;
  crawlResults: CrawlResults;
}

export interface DomainsResponse {
  data: Domain[];
}

export interface CreateDomainRequest {
  domain: string;
}

export interface CreateDomainResponse {
  id: string;
  domain: string;
  userId: string;
  createdAt: string;
}
