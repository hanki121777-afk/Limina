export type Grade = 'GOLD' | 'SILVER' | 'BRONZE' | 'REPORT' | 'BURN' | 'EMPTY';

export type QualityMode = 'strict' | 'balance' | 'sensitive';

export type Locale = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'es';

export type Tier = 'free' | 'pro' | 'yearly';

export interface ScoreBreakdownItem {
  score: number;
  reason: string;
}

export interface ScoreBreakdown {
  feasibility?: ScoreBreakdownItem;
  market_size?: ScoreBreakdownItem;
  revenue_clarity?: ScoreBreakdownItem;
  differentiation?: ScoreBreakdownItem;
  user_fit?: ScoreBreakdownItem;
}

export interface RealityCheck {
  initial_cost?: string;
  monthly_cost?: string;
  breakeven_point?: string;
  difficulty?: string;
  first_action?: string;
}

export interface Idea {
  id: string;
  user_id: string;
  created_at: string;
  grade: Grade;
  score: number;
  title: string;
  context: string;
  idea: string;
  business: {
    target: string;
    problem: string;
    solution: string;
    revenue_model: string;
  };
  prompts: {
    step: number;
    title: string;
    content: string;
  }[];
  starred: boolean;
  deleted: boolean;
  locale: Locale;
  score_breakdown?: ScoreBreakdown;
  reality_check?: RealityCheck;
}

export interface AnalysisResult {
  grade: Grade;
  score: number;
  title?: string;
  context?: string;
  idea?: string;
  business?: Idea['business'];
  prompts?: Idea['prompts'];
  summary?: string;
  keywords?: string[];
  score_breakdown?: ScoreBreakdown;
  reality_check?: RealityCheck;
}

