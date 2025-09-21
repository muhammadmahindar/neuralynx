import { Table, pk, sk } from './tableDecorator';

@Table('Content')
export class Content {
  @pk
  domain: string; // Partition key - groups content by domain

  @sk
  url: string; // Sort key - unique URL within domain

  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string; // Owner of the domain

  // Crawl data
  crawlData?: {
    title: string;
    // content: string; // Raw HTML content - NOT stored in DynamoDB, only in S3
    statusCode: number;
    loadTime: number;
    wordCount: number;
    links: string[];
    images: string[];
    forms: any[];
    buttons: any[];
    inputs: any[];
    s3Bucket: string; // S3 bucket where content is stored
    s3Key: string; // S3 key where content is stored
    crawledAt: string;
  };

  // Markdown data
  markdownData?: {
    content: string; // Markdown content
    s3Bucket: string;
    s3Key: string;
    wordCount: number;
    generatedAt: string;
    presignedUrl?: string;
  };

  // Lighthouse data
  lighthouseData?: {
    scores: {
      performance: number | null;
      accessibility: number | null;
      bestPractices: number | null;
      seo: number | null;
    };
    s3Bucket: string;
    s3Key: string;
    reportUrl?: string;
    auditedAt: string;
  };
}
