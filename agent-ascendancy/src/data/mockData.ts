// Mock Data for AI Trading Platform

import { Agent, Trade, MarketData, PerformanceData, CompetitionStats, SentimentData } from '@/lib/types';

export const mockAgents: Agent[] = [
  {
    id: 'sentiment-ai',
    name: 'SentimentBot Alpha',
    strategy: 'Social Sentiment Analysis',
    description: 'Analyzes Reddit and StockTwits sentiment with 70/30 weighting. Makes trades based on social media buzz and sentiment shifts.',
    currentValue: 124500,
    totalReturn: 24500,
    totalReturnPercentage: 24.5,
    totalTrades: 47,
    winRate: 68.1,
    cashBalance: 12450,
    riskLevel: 'Medium',
    isActive: true,
    avatar: '🧠',
    color: '#10b981',
    positions: [
      {
        id: 'pos-1',
        symbol: 'TSLA',
        companyName: 'Tesla Inc',
        quantity: 15,
        avgPrice: 245.80,
        currentPrice: 267.50,
        marketValue: 4012.50,
        unrealizedPnL: 325.50,
        unrealizedPnLPercentage: 8.83,
        sector: 'Technology'
      },
      {
        id: 'pos-2',
        symbol: 'NVDA',
        companyName: 'NVIDIA Corporation',
        quantity: 8,
        avgPrice: 485.20,
        currentPrice: 512.30,
        marketValue: 4098.40,
        unrealizedPnL: 216.80,
        unrealizedPnLPercentage: 5.59,
        sector: 'Technology'
      }
    ],
    lastTrade: {
      id: 'trade-1',
      agentId: 'sentiment-ai',
      agentName: 'SentimentBot Alpha',
      symbol: 'TSLA',
      companyName: 'Tesla Inc',
      action: 'BUY',
      quantity: 5,
      price: 267.50,
      totalValue: 1337.50,
      timestamp: '2024-12-01T14:32:00Z',
      reasoning: 'Strong bullish sentiment on Reddit (87% positive). Elon Musk tweets driving positive discussion.',
      sentimentScore: 87,
      confidence: 85,
      sector: 'Technology'
    }
  },
  {
    id: 'dip-buyer',
    name: 'DipHunter Pro',
    strategy: 'Buy the Dip',
    description: 'Purchases quality stocks after significant price drops. Uses technical analysis to identify oversold conditions.',
    currentValue: 118750,
    totalReturn: 18750,
    totalReturnPercentage: 18.75,
    totalTrades: 32,
    winRate: 75.0,
    cashBalance: 8340,
    riskLevel: 'High',
    isActive: true,
    avatar: '📉',
    color: '#3b82f6',
    positions: [
      {
        id: 'pos-3',
        symbol: 'AAPL',
        companyName: 'Apple Inc',
        quantity: 25,
        avgPrice: 180.45,
        currentPrice: 195.20,
        marketValue: 4880.00,
        unrealizedPnL: 368.75,
        unrealizedPnLPercentage: 8.18,
        sector: 'Technology'
      }
    ],
    lastTrade: {
      id: 'trade-2',
      agentId: 'dip-buyer',
      agentName: 'DipHunter Pro',
      symbol: 'AAPL',
      companyName: 'Apple Inc',
      action: 'BUY',
      quantity: 10,
      price: 195.20,
      totalValue: 1952.00,
      timestamp: '2024-12-01T13:45:00Z',
      reasoning: 'AAPL down 12% from recent highs. RSI at 28 indicates oversold. Strong fundamentals remain intact.',
      confidence: 92,
      sector: 'Technology'
    }
  },
  {
    id: 'trend-follower',
    name: 'MomentumMaster',
    strategy: 'Price Trend Following',
    description: 'Follows price momentum and moving averages. Rides trends until they show signs of reversal.',
    currentValue: 115200,
    totalReturn: 15200,
    totalReturnPercentage: 15.2,
    totalTrades: 89,
    winRate: 61.8,
    cashBalance: 15680,
    riskLevel: 'Medium',
    isActive: true,
    avatar: '📈',
    color: '#8b5cf6',
    positions: [],
    lastTrade: {
      id: 'trade-3',
      agentId: 'trend-follower',
      agentName: 'MomentumMaster',
      symbol: 'SPY',
      companyName: 'SPDR S&P 500 ETF',
      action: 'SELL',
      quantity: 20,
      price: 478.90,
      totalValue: 9578.00,
      timestamp: '2024-12-01T12:15:00Z',
      reasoning: 'SPY broke below 20-day MA. Volume increasing on downside. Taking profits at resistance.',
      confidence: 78,
      sector: 'ETF'
    }
  },
  {
    id: 'contrarian',
    name: 'ValueVulture',
    strategy: 'Contrarian Value',
    description: 'Buys undervalued stocks when others are selling. Focuses on fundamental analysis and market pessimism.',
    currentValue: 109800,
    totalReturn: 9800,
    totalReturnPercentage: 9.8,
    totalTrades: 28,
    winRate: 64.3,
    cashBalance: 22340,
    riskLevel: 'Low',
    isActive: true,
    avatar: '💎',
    color: '#f59e0b',
    positions: [
      {
        id: 'pos-4',
        symbol: 'META',
        companyName: 'Meta Platforms Inc',
        quantity: 12,
        avgPrice: 285.90,
        currentPrice: 312.40,
        marketValue: 3748.80,
        unrealizedPnL: 318.00,
        unrealizedPnLPercentage: 9.26,
        sector: 'Technology'
      }
    ],
    lastTrade: {
      id: 'trade-4',
      agentId: 'contrarian',
      agentName: 'ValueVulture',
      symbol: 'META',
      companyName: 'Meta Platforms Inc',
      action: 'BUY',
      quantity: 12,
      price: 285.90,
      totalValue: 3430.80,
      timestamp: '2024-12-01T10:30:00Z',
      reasoning: 'META trading at 15x P/E despite strong metaverse growth. Market overreacting to regulatory concerns.',
      confidence: 88,
      sector: 'Technology'
    }
  },
  {
    id: 'random-walker',
    name: 'RandomBot 3000',
    strategy: 'Random Walk',
    description: 'Makes completely random trading decisions as a control group. Proves markets aren\'t entirely random!',
    currentValue: 87300,
    totalReturn: -12700,
    totalReturnPercentage: -12.7,
    totalTrades: 156,
    winRate: 48.7,
    cashBalance: 5230,
    riskLevel: 'High',
    isActive: true,
    avatar: '🎲',
    color: '#ef4444',
    positions: [
      {
        id: 'pos-5',
        symbol: 'AMC',
        companyName: 'AMC Entertainment',
        quantity: 100,
        avgPrice: 8.90,
        currentPrice: 7.20,
        marketValue: 720.00,
        unrealizedPnL: -170.00,
        unrealizedPnLPercentage: -19.10,
        sector: 'Entertainment'
      }
    ],
    lastTrade: {
      id: 'trade-5',
      agentId: 'random-walker',
      agentName: 'RandomBot 3000',
      symbol: 'AMC',
      companyName: 'AMC Entertainment',
      action: 'BUY',
      quantity: 50,
      price: 7.20,
      totalValue: 360.00,
      timestamp: '2024-12-01T09:12:00Z',
      reasoning: 'Random number generator said buy. No further analysis needed. YOLO! 🚀',
      confidence: 50,
      sector: 'Entertainment'
    }
  }
];

export const mockTrades: Trade[] = [
  ...mockAgents.map(agent => agent.lastTrade!),
  {
    id: 'trade-6',
    agentId: 'sentiment-ai',
    agentName: 'SentimentBot Alpha',
    symbol: 'GME',
    companyName: 'GameStop Corp',
    action: 'SELL',
    quantity: 20,
    price: 18.50,
    totalValue: 370.00,
    timestamp: '2024-12-01T08:45:00Z',
    reasoning: 'WSB sentiment turning negative. Profit taking at resistance level.',
    sentimentScore: 32,
    confidence: 76,
    sector: 'Retail'
  }
];

export const mockMarketData: MarketData[] = [
  {
    symbol: 'TSLA',
    companyName: 'Tesla Inc',
    currentPrice: 267.50,
    change: 12.30,
    changePercentage: 4.82,
    volume: 45230000,
    marketCap: 850000000000,
    sector: 'Technology',
    sentimentScore: 87,
    sentimentTrend: 'Bullish'
  },
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc',
    currentPrice: 195.20,
    change: -3.45,
    changePercentage: -1.74,
    volume: 32180000,
    marketCap: 3020000000000,
    sector: 'Technology',
    sentimentScore: 65,
    sentimentTrend: 'Neutral'
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    currentPrice: 512.30,
    change: 8.90,
    changePercentage: 1.77,
    volume: 28450000,
    marketCap: 1260000000000,
    sector: 'Technology',
    sentimentScore: 78,
    sentimentTrend: 'Bullish'
  }
];

export const mockPerformanceData: PerformanceData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  
  return mockAgents.map(agent => ({
    timestamp: date.toISOString(),
    value: agent.currentValue + (Math.random() - 0.5) * 5000,
    agentId: agent.id
  }));
}).flat();

export const mockCompetitionStats: CompetitionStats = {
  totalValue: mockAgents.reduce((sum, agent) => sum + agent.currentValue, 0),
  totalTrades: mockAgents.reduce((sum, agent) => sum + agent.totalTrades, 0),
  activeAgents: mockAgents.filter(agent => agent.isActive).length,
  topPerformer: mockAgents.sort((a, b) => b.totalReturnPercentage - a.totalReturnPercentage)[0].name,
  worstPerformer: mockAgents.sort((a, b) => a.totalReturnPercentage - b.totalReturnPercentage)[0].name,
  avgReturn: mockAgents.reduce((sum, agent) => sum + agent.totalReturnPercentage, 0) / mockAgents.length,
  totalVolume: 150000000
};

export const mockSentimentData: SentimentData[] = [
  {
    symbol: 'TSLA',
    score: 87,
    trend: 'up',
    volume: 1250,
    sources: { reddit: 89, stocktwits: 84, news: 88 }
  },
  {
    symbol: 'AAPL',
    score: 65,
    trend: 'stable',
    volume: 890,
    sources: { reddit: 67, stocktwits: 62, news: 66 }
  },
  {
    symbol: 'NVDA',
    score: 78,
    trend: 'up',
    volume: 1080,
    sources: { reddit: 82, stocktwits: 75, news: 77 }
  }
];