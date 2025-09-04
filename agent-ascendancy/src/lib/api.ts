import { supabase } from './supabase'
import { Agent, Trade, Position, PerformanceData, CompetitionStats } from './types'
import { calculateTradeProfitLoss, TradeWithPnL } from './tradeUtils'

export class ApiService {
  // Get all agents with their current performance
  static async getAgents(): Promise<Agent[]> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')

      if (error) throw error

      // For each agent, get their latest performance, trades, and positions
      const agentsWithData = await Promise.all(
        agents.map(async (dbAgent: any) => {
          try {
            const [trades, portfolio, performance] = await Promise.all([
              ApiService.getAgentTrades(dbAgent.id).catch(e => { return []; }),
              ApiService.getAgentPositions(dbAgent.id).catch(e => { return []; }),
              ApiService.getLatestPerformance(dbAgent.id).catch(e => { return null; })
            ])

          const lastTrade = trades.length > 0 ? trades[0] : null
          const currentValue = performance?.portfolio_value || dbAgent.current_value || 100
          const totalReturn = dbAgent.total_return || 0
          const totalReturnPercentage = (totalReturn * 100)

            return {
              id: dbAgent.id,
              name: dbAgent.name,
              strategy: dbAgent.strategy,
              description: ApiService.getAgentDescription(dbAgent.id),
              currentValue: currentValue,
              totalReturn: totalReturn,
              totalReturnPercentage: totalReturnPercentage,
              totalTrades: dbAgent.total_trades || 0,
              winRate: (dbAgent.win_rate || 0) * 100,
              positions: portfolio,
              avatar: ApiService.getAgentAvatar(dbAgent.id),
              color: ApiService.getAgentColor(dbAgent.id),
              lastTrade: lastTrade
            }
          } catch (error) {
            throw error
          }
        })
      )

      return agentsWithData
    } catch (error) {
      throw error
    }
  }

  // Get recent trades across all agents with profit/loss calculations
  static async getRecentTrades(limit: number = 50): Promise<TradeWithPnL[]> {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          *,
          agents(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const mappedTrades = trades.map((dbTrade: any) => ({
        id: dbTrade.id,
        agentId: dbTrade.agent_id,
        agentName: dbTrade.agents?.name || 'Unknown Agent',
        symbol: dbTrade.symbol,
        companyName: ApiService.getCompanyName(dbTrade.symbol),
        action: dbTrade.action as 'BUY' | 'SELL' | 'HOLD',
        quantity: dbTrade.quantity,
        price: dbTrade.price,
        totalValue: dbTrade.quantity * dbTrade.price,
        timestamp: dbTrade.created_at,
        reasoning: dbTrade.reasoning,
        confidence: (dbTrade.confidence || 0.5) * 100,
        sector: 'Technology' // You can enhance this with a symbol-to-sector mapping
      }))

      // Calculate profit/loss for all trades
      return calculateTradeProfitLoss(mappedTrades)
    } catch (error) {
      throw error
    }
  }

  // Get performance data for charts
  static async getPerformanceData(days: number = 30): Promise<PerformanceData[]> {
    try {
      const { data: performance, error } = await supabase
        .from('daily_performance')
        .select('*')
        .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) throw error

      return performance.map((perf: any) => ({
        timestamp: perf.date,
        value: perf.portfolio_value,
        agentId: perf.agent_id
      }))
    } catch (error) {
      throw error
    }
  }

  // Get competition statistics
  static async getCompetitionStats(): Promise<CompetitionStats> {
    try {
      const agents = await ApiService.getAgents()
      
      const totalValue = agents.reduce((sum, agent) => sum + agent.currentValue, 0)
      const totalTrades = agents.reduce((sum, agent) => sum + agent.totalTrades, 0)
      const activeAgents = agents.length
      const topPerformer = agents.sort((a, b) => b.totalReturnPercentage - a.totalReturnPercentage)[0]?.name || 'N/A'
      const worstPerformer = agents.sort((a, b) => a.totalReturnPercentage - b.totalReturnPercentage)[0]?.name || 'N/A'
      const avgReturn = agents.reduce((sum, agent) => sum + agent.totalReturnPercentage, 0) / agents.length

      return {
        totalValue,
        totalTrades,
        activeAgents,
        topPerformer,
        worstPerformer,
        avgReturn,
        totalVolume: 0 // You can calculate this from trades if needed
      }
    } catch (error) {
      throw error
    }
  }

  // Helper methods
  private static async getAgentTrades(agentId: string): Promise<Trade[]> {
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (error) return []

    return trades.map((trade: any) => ({
      id: trade.id,
      agentId: trade.agent_id,
      agentName: '', // Will be filled by parent
      symbol: trade.symbol,
      companyName: ApiService.getCompanyName(trade.symbol),
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      totalValue: trade.quantity * trade.price,
      timestamp: trade.created_at,
      reasoning: trade.reasoning,
      confidence: trade.confidence || 0.5,
      sector: 'Technology'
    }))
  }

  private static async getAgentPositions(agentId: string): Promise<Position[]> {
    const { data: portfolio, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('agent_id', agentId)
      .gt('quantity', 0)

    if (error) return []

    return portfolio.map((position: any) => {
      const currentPrice = ApiService.getCurrentPrice(position.symbol)
      const marketValue = position.quantity * currentPrice
      const unrealizedPnL = marketValue - (position.quantity * position.average_cost)
      const unrealizedPnLPercentage = ((unrealizedPnL) / (position.quantity * position.average_cost)) * 100

      return {
        id: position.id,
        symbol: position.symbol,
        companyName: ApiService.getCompanyName(position.symbol),
        quantity: position.quantity,
        avgPrice: position.average_cost,
        currentPrice: currentPrice,
        marketValue: marketValue,
        unrealizedPnL: unrealizedPnL,
        unrealizedPnLPercentage: unrealizedPnLPercentage,
        sector: 'Technology'
      }
    })
  }

  private static async getLatestPerformance(agentId: string): Promise<any> {
    const { data, error } = await supabase
      .from('daily_performance')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data
  }

  private static getAgentDescription(agentId: string): string {
    const descriptions: Record<string, string> = {
      '550e8400-e29b-41d4-a716-446655440001': 'Analyzes Reddit and StockTwits sentiment with 70/30 weighting. Makes trades based on social media buzz and sentiment shifts.'
    }
    return descriptions[agentId] || 'AI trading agent using advanced algorithms to make investment decisions.'
  }

  private static getAgentAvatar(agentId: string): string {
    const avatars: Record<string, string> = {
      '550e8400-e29b-41d4-a716-446655440001': '🧠'
    }
    return avatars[agentId] || '🤖'
  }

  private static getAgentColor(agentId: string): string {
    const colors: Record<string, string> = {
      '550e8400-e29b-41d4-a716-446655440001': '#10b981'
    }
    return colors[agentId] || '#6366f1'
  }

  private static getCompanyName(symbol: string): string {
    const names: Record<string, string> = {
      'SLV': 'iShares Silver Trust',
      'GLD': 'SPDR Gold Shares',
      'BABA': 'Alibaba Group',
      'PI': 'Impinj Inc',
      'IDEX': 'Ideanomics Inc'
    }
    return names[symbol] || symbol
  }

  private static getCurrentPrice(symbol: string): number {
    const prices: Record<string, number> = {
      'SLV': 36.19,
      'GLD': 318.07,
      'BABA': 135.00,
      'PI': 187.47,
      'IDEX': 45.00
    }
    return prices[symbol] || 100.00
  }

  private static calculateWinRate(trades: Trade[]): number {
    if (trades.length === 0) return 0
    const buyTrades = trades.filter(t => t.action === 'BUY').length
    return (buyTrades / trades.length) * 100
  }
}