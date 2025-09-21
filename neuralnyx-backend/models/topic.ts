import { Table, pk, sk } from './tableDecorator';

@Table('Topic')
export class Topic {
  @pk
  id: string; // Primary key - unique topic ID

  @sk
  domain: string; // Secondary key - domain the topic belongs to

  value: string; // Topic value/content

  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string; // Owner of the topic
}
