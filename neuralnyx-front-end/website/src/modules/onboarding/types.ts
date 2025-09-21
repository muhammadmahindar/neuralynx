export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  estimatedTime: string;
}

export interface CompanyProfile {
  name: string;
  website: string;
  industry: string;
  companySize: string;
  targetAudience: string[];
  brandVoice: {
    tone: string;
    style: string;
    personality: string[];
  };
  regions: string[];
  languages: string[];
  doNotSay: string[];
  differentiators: string[];
}

export interface Competitor {
  id: string;
  name: string;
  website: string;
  description?: string;
  discovered: boolean; // true if auto-discovered
  priority: "high" | "medium" | "low";
}

export interface BusinessGoal {
  id: string;
  objective: string;
  kpis: string[];
  target: number;
  timeframe: string; // e.g., "12 weeks", "6 months"
  currentValue?: number;
  unit: string; // e.g., "MQLs", "signups", "revenue"
}

export interface DataConnection {
  id: string;
  type: "ga4" | "gsc" | "cms" | "crm" | "csv";
  name: string;
  status: "connected" | "pending" | "error" | "disconnected";
  lastSync?: Date;
  scopes: string[];
}

export interface OnboardingData {
  company: CompanyProfile | null;
  competitors: Competitor[];
  goals: BusinessGoal[];
  connections: DataConnection[];
  completedSteps: string[];
}
