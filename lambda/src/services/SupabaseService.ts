import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAgent, DatabaseTrade, DatabasePerformance } from '../types';

export class SupabaseService {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.SUPABASE_URL!;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.SUPABASE_ANON_KEY!;
    
    if (!url || !key) {
      throw new Error('Missing Supabase configuration');
    }

    this.client = createClient(url, key);
  }

  async getAgent(agentId: string): Promise<DatabaseAgent | null> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    return data;
  }

  async createAgent(agent: Omit<DatabaseAgent, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { error } = await this.client
      .from('agents')
      .insert({
        ...agent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`);
    }
  }

  async updateAgentPerformance(
    agentId: string, 
    updates: Partial<Pick<DatabaseAgent, 'currentValue' | 'totalReturn' | 'totalTrades' | 'winRate'>>
  ): Promise<void> {
    const { error } = await this.client
      .from('agents')
      .update({
        current_value: updates.currentValue,
        total_return: updates.totalReturn,
        total_trades: updates.totalTrades,
        win_rate: updates.winRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId);

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }
  }

  async saveTrade(trade: Omit<DatabaseTrade, 'id'>): Promise<void> {
    const { error } = await this.client
      .from('trades')
      .insert({
        agent_id: trade.agentId,
        date: trade.date,
        symbol: trade.symbol,
        action: trade.action,
        quantity: trade.quantity,
        price: trade.price,
        reasoning: trade.reasoning,
        confidence: trade.confidence
      });

    if (error) {
      throw new Error(`Failed to save trade: ${error.message}`);
    }
  }

  async saveDailyPerformance(performance: Omit<DatabasePerformance, 'id'>): Promise<void> {
    const { error } = await this.client
      .from('daily_performance')
      .insert({
        agent_id: performance.agentId,
        date: performance.date,
        portfolio_value: performance.portfolioValue,
        daily_return: performance.dailyReturn,
        positions: performance.positions
      });

    if (error) {
      throw new Error(`Failed to save performance: ${error.message}`);
    }
  }

  async getRecentTradesOld(agentId: string, limit: number = 10): Promise<DatabaseTrade[]> {
    const { data, error } = await this.client
      .from('trades')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }

    return data.map(trade => ({
      id: trade.id,
      agentId: trade.agent_id,
      date: trade.date,
      symbol: trade.symbol,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      reasoning: trade.reasoning,
      confidence: trade.confidence
    }));
  }

  async getPerformanceHistoryOld(agentId: string, days: number = 30): Promise<DatabasePerformance[]> {
    const { data, error } = await this.client
      .from('daily_performance')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      throw new Error(`Failed to fetch performance: ${error.message}`);
    }

    return data.map(perf => ({
      id: perf.id,
      agentId: perf.agent_id,
      date: perf.date,
      portfolioValue: perf.portfolio_value,
      dailyReturn: perf.daily_return,
      positions: perf.positions
    }));
  }

  async getAllAgents(): Promise<DatabaseAgent[]> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .order('current_value', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all agents: ${error.message}`);
    }

    return data.map(agent => ({
      id: agent.id,
      name: agent.name,
      strategy: agent.strategy,
      currentValue: agent.current_value,
      totalReturn: agent.total_return,
      winRate: agent.win_rate,
      totalTrades: agent.total_trades,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at
    }));
  }

  // New methods for API handlers
  async getAgents(filter: any = {}): Promise<any[]> {
    const { data, error } = await this.client
      .from('agents')
      .select('*')
      .match(filter);

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data;
  }

  async getTradesByAgent(agentId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('trades')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }

    return data;
  }

  async getPortfolioByAgent(agentId: string): Promise<any[]> {
    const { data, error } = await this.client
      .from('portfolio')
      .select('*')
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }

    return data;
  }

  async getLatestPerformance(agentId: string): Promise<any> {
    const { data, error } = await this.client
      .from('daily_performance')
      .select('*')
      .eq('agent_id', agentId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch performance: ${error.message}`);
    }

    return data;
  }

  async getRecentTrades(limit: number = 50): Promise<any[]> {
    const { data, error } = await this.client
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent trades: ${error.message}`);
    }

    return data;
  }

  async getPerformanceHistory(days: number = 30): Promise<any[]> {
    const { data, error } = await this.client
      .from('daily_performance')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch performance history: ${error.message}`);
    }

    return data;
  }

  // Methods needed by the updated agent
  async getAgentPortfolio(agentId: string): Promise<any[]> {
    return this.getPortfolioByAgent(agentId);
  }

  async getAgentTrades(agentId: string, symbol?: string, limit: number = 10): Promise<any[]> {
    let query = this.client
      .from('trades')
      .select('*')
      .eq('agent_id', agentId);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch agent trades: ${error.message}`);
    }

    return data;
  }
}