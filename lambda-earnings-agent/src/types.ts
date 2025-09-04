export interface EarningsEvent {
  symbol: string;
  company: string;
  date: string;
  time: 'pre-market' | 'after-market' | 'during-market';
  estimatedEPS?: number;
  actualEPS?: number;
  estimatedRevenue?: number;
  actualRevenue?: number;
  marketCap?: number;
  sector: string;
}

export interface IPOEvent {
  symbol: string;
  company: string;
  date: string;
  priceRange: {
    low: number;
    high: number;
  };
  shares: number;
  marketCap?: number;
  sector: string;
  underwriter: string;
}

export interface HistoricalEarningsData {
  symbol: string;
  quarter: string;
  year: number;
  actualEPS: number;
  estimatedEPS: number;
  surprise: number; // (actual - estimated) / estimated * 100
  priceChangePre: number; // % price change in pre-market after earnings
  priceChangePost: number; // % price change 1 day after earnings
  volume: number;
  marketCap: number;
}

export interface EarningsAnalysis {
  symbol: string;
  company: string;
  upcomingEarnings: EarningsEvent;
  historicalPerformance: HistoricalEarningsData[];
  averageSurprise: number;
  averagePriceImpact: number;
  sentiment: {
    newsScore: number;
    analystRating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    priceTargets: {
      high: number;
      low: number;
      average: number;
    };
  };
  technicalIndicators: {
    rsi: number;
    volume: number;
    priceChange7d: number;
    priceChange30d: number;
  };
}

export interface Trade {
  id?: string;
  agent_id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_value: number;
  reason: string;
  confidence_score: number;
  executed_at: string;
  strategy: string;
}

export interface Portfolio {
  cash_available: number;
  total_value: number;
  positions: {
    [symbol: string]: {
      quantity: number;
      averagePrice: number;
      currentPrice?: number;
    };
  };
}

export interface TradingDecision {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  reasoning: string;
  confidence: number;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
}