import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number) {
  if (score >= 80) return "text-gray-900 bg-green-400";
  if (score >= 60) return "text-gray-900 bg-yellow-400";
  if (score >= 40) return "text-gray-900 bg-orange-400";
  return "text-gray-900 bg-red-400";
}

export function getScoreChartColor(score: number) {
  if (score >= 80) return "var(--color-score-green)";
  if (score >= 60) return "var(--color-score-yellow)";
  if (score >= 40) return "var(--color-score-orange)";
  return "var(--color-score-red)";
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function sanitizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function joinPath(includeHttp: boolean, ...paths: string[]): string {
  let path = paths
    .map((path) => {
      if (path.endsWith("/")) {
        return path.slice(0, -1);
      }
      if (path.startsWith("/")) {
        return path.slice(1);
      }
      return path;
    })
    .join("/");
  if (includeHttp) {
    path = "https://" + path;
  }
  return path;
}
