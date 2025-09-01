import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SupabaseService } from '../services/SupabaseService';

// Initialize Supabase service
const supabaseService = new SupabaseService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function for CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
});

// Helper function for API responses
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: getCorsHeaders(),
  body: JSON.stringify(body)
});

// Get all agents with their performance data
export const getAgents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('API: Getting agents...');

    // Get all active agents
    const agents = await supabaseService.getAgents({ is_active: true });
    
    // Get detailed data for each agent
    const agentsWithData = await Promise.all(
      agents.map(async (agent) => {
        const [trades, portfolio, performance] = await Promise.all([
          supabaseService.getTradesByAgent(agent.id),
          supabaseService.getPortfolioByAgent(agent.id),
          supabaseService.getLatestPerformance(agent.id)
        ]);

        const lastTrade = trades.length > 0 ? trades[0] : null;
        const totalPortfolioValue = performance?.portfolio_value || agent.current_value || 100;
        const totalReturn = totalPortfolioValue - 100;
        const totalReturnPercentage = (totalReturn / 100) * 100;

        return {
          id: agent.id,
          name: agent.name,
          strategy: agent.strategy,
          description: getAgentDescription(agent.id),
          currentValue: totalPortfolioValue,
          totalReturn: totalReturn,
          totalReturnPercentage: totalReturnPercentage,
          totalTrades: trades.length,
          winRate: calculateWinRate(trades),
          positions: portfolio.map(p => ({
            id: p.id,
            symbol: p.symbol,
            companyName: getCompanyName(p.symbol),
            quantity: p.quantity,
            avgPrice: p.average_price,
            currentPrice: getCurrentPrice(p.symbol),
            marketValue: p.current_value,
            unrealizedPnL: p.current_value - (p.quantity * p.average_price),
            unrealizedPnLPercentage: ((p.current_value - (p.quantity * p.average_price)) / (p.quantity * p.average_price)) * 100,
            sector: 'Technology' // You can enhance this with a symbol-to-sector mapping
          })),
          cashBalance: agent.cash_balance || 100,
          riskLevel: agent.risk_level as 'Low' | 'Medium' | 'High',
          isActive: agent.is_active,
          avatar: getAgentAvatar(agent.id),
          color: getAgentColor(agent.id),
          lastTrade: lastTrade ? {
            id: lastTrade.id,
            agentId: lastTrade.agent_id,
            agentName: agent.name,
            symbol: lastTrade.symbol,
            companyName: getCompanyName(lastTrade.symbol),
            action: lastTrade.action as 'BUY' | 'SELL' | 'HOLD',
            quantity: lastTrade.quantity,
            price: lastTrade.price,
            totalValue: lastTrade.quantity * lastTrade.price,
            timestamp: lastTrade.created_at,
            reasoning: lastTrade.reasoning,
            sentimentScore: lastTrade.sentiment_score,
            confidence: lastTrade.confidence,
            sector: 'Technology'
          } : undefined
        };
      })
    );

    return createResponse(200, { agents: agentsWithData });
  } catch (error) {
    console.error('Error getting agents:', error);
    return createResponse(500, { error: 'Failed to get agents' });
  }
};

// Get recent trades across all agents
export const getRecentTrades = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    console.log(`API: Getting ${limit} recent trades...`);

    const trades = await supabaseService.getRecentTrades(limit);
    const agents = await supabaseService.getAgents();

    const tradesWithDetails = trades.map(trade => {
      const agent = agents.find(a => a.id === trade.agent_id);
      return {
        id: trade.id,
        agentId: trade.agent_id,
        agentName: agent?.name || 'Unknown Agent',
        symbol: trade.symbol,
        companyName: getCompanyName(trade.symbol),
        action: trade.action as 'BUY' | 'SELL' | 'HOLD',
        quantity: trade.quantity,
        price: trade.price,
        totalValue: trade.quantity * trade.price,
        timestamp: trade.created_at,
        reasoning: trade.reasoning,
        sentimentScore: trade.sentiment_score,
        confidence: trade.confidence,
        sector: 'Technology'
      };
    });

    return createResponse(200, { trades: tradesWithDetails });
  } catch (error) {
    console.error('Error getting recent trades:', error);
    return createResponse(500, { error: 'Failed to get recent trades' });
  }
};

// Get performance data for charts
export const getPerformanceData = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const days = parseInt(event.queryStringParameters?.days || '30');
    console.log(`API: Getting performance data for ${days} days...`);

    const performanceData = await supabaseService.getPerformanceHistory(days);
    
    const chartData = performanceData.map(perf => ({
      timestamp: perf.date,
      value: perf.portfolio_value,
      agentId: perf.agent_id
    }));

    return createResponse(200, { performanceData: chartData });
  } catch (error) {
    console.error('Error getting performance data:', error);
    return createResponse(500, { error: 'Failed to get performance data' });
  }
};

// Get competition statistics
export const getCompetitionStats = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('API: Getting competition stats...');

    const [agents, trades] = await Promise.all([
      supabaseService.getAgents({ is_active: true }),
      supabaseService.getRecentTrades(1000) // Get more trades for stats
    ]);

    const totalValue = agents.reduce((sum, agent) => sum + (agent.current_value || 100), 0);
    const totalTrades = trades.length;
    const activeAgents = agents.filter(agent => agent.is_active).length;
    
    // Calculate performance stats
    const returns = agents.map(agent => ((agent.current_value || 100) - 100) / 100 * 100);
    const topPerformer = agents.sort((a, b) => (b.current_value || 100) - (a.current_value || 100))[0]?.name || 'N/A';
    const worstPerformer = agents.sort((a, b) => (a.current_value || 100) - (b.current_value || 100))[0]?.name || 'N/A';
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

    const stats = {
      totalValue,
      totalTrades,
      activeAgents,
      topPerformer,
      worstPerformer,
      avgReturn,
      totalVolume: trades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0)
    };

    return createResponse(200, { stats });
  } catch (error) {
    console.error('Error getting competition stats:', error);
    return createResponse(500, { error: 'Failed to get competition stats' });
  }
};

// Handle CORS preflight requests
export const handleCors = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return createResponse(200, {});
};

// Helper functions
function getAgentDescription(agentId: string): string {
  const descriptions: Record<string, string> = {
    '550e8400-e29b-41d4-a716-446655440001': 'Analyzes Reddit and StockTwits sentiment with 70/30 weighting. Makes trades based on social media buzz and sentiment shifts.'
  };
  return descriptions[agentId] || 'AI trading agent using advanced algorithms to make investment decisions.';
}

function getAgentAvatar(agentId: string): string {
  const avatars: Record<string, string> = {
    '550e8400-e29b-41d4-a716-446655440001': '🧠'
  };
  return avatars[agentId] || '🤖';
}

function getAgentColor(agentId: string): string {
  const colors: Record<string, string> = {
    '550e8400-e29b-41d4-a716-446655440001': '#10b981'
  };
  return colors[agentId] || '#6366f1';
}

function getCompanyName(symbol: string): string {
  const names: Record<string, string> = {
    'SLV': 'iShares Silver Trust',
    'GLD': 'SPDR Gold Shares',
    'BABA': 'Alibaba Group',
    'PI': 'Impinj Inc',
    'IDEX': 'Ideanomics Inc'
  };
  return names[symbol] || symbol;
}

function getCurrentPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'SLV': 36.19,
    'GLD': 318.07,
    'BABA': 135.00,
    'PI': 187.47,
    'IDEX': 45.00
  };
  return prices[symbol] || 100.00;
}

function calculateWinRate(trades: any[]): number {
  if (trades.length === 0) return 0;
  // Simplified win rate calculation - you can enhance this
  const buyTrades = trades.filter(t => t.action === 'BUY').length;
  return (buyTrades / trades.length) * 100;
}