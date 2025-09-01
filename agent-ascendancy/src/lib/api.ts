import { supabase } from './supabase'
import { Agent, Trade, Position, PerformanceData, CompetitionStats } from './types'

export class ApiService {
  // Get all agents with their current performance
  static async getAgents(): Promise<Agent[]> {
    try {
      console.log('API: Getting agents...')

      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      // For each agent, get their latest performance, trades, and positions
      const agentsWithData = await Promise.all(
        agents.map(async (dbAgent: any) => {
          const [trades, portfolio, performance] = await Promise.all([
            this.getAgentTrades(dbAgent.id),
            this.getAgentPositions(dbAgent.id),
            this.getLatestPerformance(dbAgent.id)
          ])

          const lastTrade = trades.length > 0 ? trades[0] : null
          const totalPortfolioValue = performance?.portfolio_value || dbAgent.current_value || 100
          const totalReturn = totalPortfolioValue - 100
          const totalReturnPercentage = (totalReturn / 100) * 100

          return {
            id: dbAgent.id,
            name: dbAgent.name,
            strategy: dbAgent.strategy,
            description: this.getAgentDescription(dbAgent.id),
            currentValue: totalPortfolioValue,
            totalReturn: totalReturn,
            totalReturnPercentage: totalReturnPercentage,
            totalTrades: trades.length,
            winRate: this.calculateWinRate(trades),
            positions: portfolio,
            cashBalance: dbAgent.cash_balance || 100,
            riskLevel: dbAgent.risk_level as 'Low' | 'Medium' | 'High',
            isActive: dbAgent.is_active,
            avatar: this.getAgentAvatar(dbAgent.id),
            color: this.getAgentColor(dbAgent.id),
            lastTrade: lastTrade
          }
        })
      )

      return agentsWithData
    } catch (error) {
      console.error('Error fetching agents:', error)
      throw error
    }
  }

  // Get recent trades across all agents
  static async getRecentTrades(limit: number = 50): Promise<Trade[]> {
    try {
      console.log(`API: Getting ${limit} recent trades...`)

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
        companyName: this.getCompanyName(dbTrade.symbol),
        action: dbTrade.action as 'BUY' | 'SELL' | 'HOLD',
        quantity: dbTrade.quantity,
        price: dbTrade.price,
        totalValue: dbTrade.quantity * dbTrade.price,
        timestamp: dbTrade.created_at,
        reasoning: dbTrade.reasoning,
        sentimentScore: dbTrade.sentiment_score,
        confidence: dbTrade.confidence,
        sector: 'Technology' // You can enhance this with a symbol-to-sector mapping
      }))

      return mappedTrades
    } catch (error) {
      console.error('Error fetching recent trades:', error)
      throw error
    }
  }

  // Get performance data for charts
  static async getPerformanceData(days: number = 30): Promise<PerformanceData[]> {
    try {
      console.log(`API: Getting performance data for ${days} days...`)

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
      console.error('Error fetching performance data:', error)
      throw error
    }
  }

  // Get competition statistics
  static async getCompetitionStats(): Promise<CompetitionStats> {
    try {
      console.log('API: Getting competition stats...')

      const agents = await this.getAgents()
      
      const totalValue = agents.reduce((sum, agent) => sum + agent.currentValue, 0)
      const totalTrades = agents.reduce((sum, agent) => sum + agent.totalTrades, 0)
      const activeAgents = agents.filter(agent => agent.isActive).length
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
      console.error('Error fetching competition stats:', error)
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
      companyName: this.getCompanyName(trade.symbol),
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      totalValue: trade.quantity * trade.price,
      timestamp: trade.created_at,
      reasoning: trade.reasoning,
      sentimentScore: trade.sentiment_score,
      confidence: trade.confidence,
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
      const currentPrice = this.getCurrentPrice(position.symbol)
      const marketValue = position.quantity * currentPrice
      const unrealizedPnL = marketValue - (position.quantity * position.average_price)
      const unrealizedPnLPercentage = ((unrealizedPnL) / (position.quantity * position.average_price)) * 100

      return {
        id: position.id,
        symbol: position.symbol,
        companyName: this.getCompanyName(position.symbol),
        quantity: position.quantity,
        avgPrice: position.average_price,
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