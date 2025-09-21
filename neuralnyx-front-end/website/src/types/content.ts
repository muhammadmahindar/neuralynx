export interface Content {
  title: string;
  metaDescription: string;
  url?: string;
  s3Url?: string;
  topics?: string[];

  id?: number;
  lastModified?: string;
  content?: string;
}

export interface Topic {
  id: string;
  value: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicsResponse {
  data: Topic[];
  message?: string;
  success: boolean;
}

export interface TopicResponse {
  data: Topic;
  message?: string;
  success: boolean;
}
