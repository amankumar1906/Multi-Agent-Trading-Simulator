// AI Trading Platform Data Types

export interface Agent {
  id: string;
  name: string;
  strategy: string;
  description: string;
  currentValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  totalTrades: number;
  winRate: number;
  positions: Position[];
  cashBalance: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  isActive: boolean;
  avatar: string;
  color: string;
  lastTrade?: Trade;
}

export interface Position {
  id: string;
  symbol: string;
  companyName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  sector: string;
}

export interface Trade {
  id: string;
  agentId: string;
  agentName: string;
  symbol: string;
  companyName: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  price: number;
  totalValue: number;
  timestamp: string;
  reasoning: string;
  sentimentScore?: number;
  confidence: number;
  sector: string;
}

export interface MarketData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercentage: number;
  volume: number;
  marketCap: number;
  sector: string;
  sentimentScore: number;
  sentimentTrend: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface PerformanceData {
  timestamp: string;
  value: number;
  agentId: string;
}

export interface SentimentData {
  symbol: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  volume: number;
  sources: {
    reddit: number;
    stocktwits: number;
    news: number;
  };
}

export interface CompetitionStats {
  totalValue: number;
  totalTrades: number;
  activeAgents: number;
  topPerformer: string;
  worstPerformer: string;
  avgReturn: number;
  totalVolume: number;
}

export interface ChartDataPoint {
  timestamp: string;
  [key: string]: number | string;
}