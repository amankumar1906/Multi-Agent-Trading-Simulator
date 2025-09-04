export interface AgentState {
  agentId: string;
  currentDate: string;
  availableCash: number;
  portfolio: Record<string, number>; // symbol -> quantity
  processingStatus: string;
}

export interface SentimentAgentState extends AgentState {
  targetSymbols: string[];
  redditPosts: RedditPost[];
  stocktwitsPosts: StocktwitsPost[];
  sentimentScores: Record<string, number>; // symbol -> sentiment score (0-1)
  tradeDecisions: TradeDecision[];
  debug?: {
    aiResponse?: string;
  };
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  score: number;
  comments: number;
  subreddit: string;
  created: number;
  symbols: string[];
}

export interface StocktwitsPost {
  id: string;
  content: string;
  sentiment: string;
  symbol: string;
  created: number;
}

export interface TradeDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
  currentPrice: number;
  reasoning: string;
  confidence: number; // 0-1
  sentimentScore: number;
}

export interface DatabaseAgent {
  id: string;
  name: string;
  strategy: string;
  currentValue: number;
  totalReturn: number;
  winRate: number;
  totalTrades: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseTrade {
  id: string;
  agentId: string;
  date: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  reasoning: string;
  confidence: number;
}

export interface DatabasePerformance {
  id: string;
  agentId: string;
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  positions: Record<string, number>;
}