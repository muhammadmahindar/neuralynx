import { Table, pk, sk } from './tableDecorator';

@Table('Domain')
export class Domain {
  @pk
  userId: string;
  @sk
  domain: string;

  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  businessSummary?: string;

  // Crawl results metadata
  lastCrawledAt?: string;
  crawlResults?: {
    s3Bucket: string;
    s3BaseKey: string;
    totalPages: number;
    lighthouseScore?: number;
  };

  // Markdown results metadata
  markdownResults?: {
    s3Key: string;
    presignedUrl: string;
    bucket: string;
    wordCount: number;
    generatedAt: string;
  };

  // Lighthouse results metadata
  lighthouseResults?: {
    s3Key: string;
    presignedUrl: string;
    bucket: string;
  };

  // Sitemap results metadata
  sitemapResults?: {
    totalUrls: number;
    lastModified?: string;
    s3Key: string;
  };

  // Business analysis results from Bedrock
  businessAnalysis?: {
    summary: string;
    businessType: string;
    targetAudience: string;
    keyServices: string[];
    industry: string;
    analyzedAt: string;
  };
}
