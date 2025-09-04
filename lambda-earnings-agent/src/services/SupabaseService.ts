import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Trade, Portfolio } from '../types';

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

  async getAgentPortfolio(agentId: string): Promise<Portfolio> {
    try {
      console.log(`📊 Fetching portfolio for agent: ${agentId}`);
      
      const { data: portfolioData, error: portfolioError } = await this.client
        .from('portfolio')
        .select('*')
        .eq('agent_id', agentId);

      if (portfolioError) {
        throw new Error(`Failed to fetch portfolio: ${portfolioError.message}`);
      }

      // Get cash balance
      const { data: agentData, error: agentError } = await this.client
        .from('agents')
        .select('current_value, cash_available')
        .eq('id', agentId)
        .single();

      if (agentError) {
        throw new Error(`Failed to fetch agent data: ${agentError.message}`);
      }

      const positions: { [symbol: string]: { quantity: number; averagePrice: number } } = {};
      
      // Process portfolio positions
      portfolioData.forEach((position: any) => {
        positions[position.symbol] = {
          quantity: position.quantity,
          averagePrice: position.average_price
        };
      });

      const portfolio: Portfolio = {
        cash_available: agentData.cash_available || 100000, // Default starting cash
        total_value: agentData.current_value || 100000,
        positions
      };

      console.log(`💰 Portfolio loaded: $${portfolio.cash_available} cash, ${Object.keys(positions).length} positions`);
      return portfolio;

    } catch (error) {
      console.error('❌ Error fetching portfolio:', error);
      // Return default portfolio for new agents
      return {
        cash_available: 100000,
        total_value: 100000,
        positions: {}
      };
    }
  }

  async getAgentTrades(agentId: string, symbol?: string, limit: number = 20): Promise<Trade[]> {
    try {
      console.log(`📋 Fetching trades for agent: ${agentId}${symbol ? ` symbol: ${symbol}` : ''}`);

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
        throw new Error(`Failed to fetch trades: ${error.message}`);
      }

      const trades: Trade[] = data.map((trade: any) => ({
        id: trade.id,
        agent_id: trade.agent_id,
        symbol: trade.symbol,
        action: trade.action,
        quantity: trade.quantity,
        price: trade.price,
        total_value: trade.total_value,
        reason: trade.reason,
        confidence_score: trade.confidence_score,
        executed_at: trade.executed_at || trade.created_at,
        strategy: trade.strategy
      }));

      console.log(`📊 Found ${trades.length} trades for agent ${agentId}`);
      return trades;

    } catch (error) {
      console.error('❌ Error fetching trades:', error);
      return [];
    }
  }

  async saveTrade(trade: Trade): Promise<void> {
    try {
      console.log(`💾 Saving trade: ${trade.action} ${trade.quantity} ${trade.symbol} at $${trade.price}`);

      const { error } = await this.client
        .from('trades')
        .insert({
          agent_id: trade.agent_id,
          symbol: trade.symbol,
          action: trade.action,
          quantity: trade.quantity,
          price: trade.price,
          total_value: trade.total_value,
          reason: trade.reason,
          confidence_score: trade.confidence_score,
          executed_at: trade.executed_at,
          strategy: trade.strategy,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to save trade: ${error.message}`);
      }

      console.log(`✅ Trade saved successfully`);

    } catch (error) {
      console.error('❌ Error saving trade:', error);
      throw error;
    }
  }

  async updatePortfolio(agentId: string, symbol: string, action: 'BUY' | 'SELL', quantity: number, price: number): Promise<void> {
    try {
      console.log(`🔄 Updating portfolio: ${action} ${quantity} ${symbol} at $${price}`);

      // Get current position
      const { data: currentPosition, error: fetchError } = await this.client
        .from('portfolio')
        .select('*')
        .eq('agent_id', agentId)
        .eq('symbol', symbol)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch current position: ${fetchError.message}`);
      }

      if (action === 'BUY') {
        if (currentPosition) {
          // Update existing position
          const newQuantity = currentPosition.quantity + quantity;
          const newAveragePrice = ((currentPosition.quantity * currentPosition.average_price) + (quantity * price)) / newQuantity;

          const { error: updateError } = await this.client
            .from('portfolio')
            .update({
              quantity: newQuantity,
              average_price: newAveragePrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentPosition.id);

          if (updateError) {
            throw new Error(`Failed to update position: ${updateError.message}`);
          }
        } else {
          // Create new position
          const { error: insertError } = await this.client
            .from('portfolio')
            .insert({
              agent_id: agentId,
              symbol,
              quantity,
              average_price: price,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            throw new Error(`Failed to create position: ${insertError.message}`);
          }
        }
      } else { // SELL
        if (currentPosition && currentPosition.quantity >= quantity) {
          const newQuantity = currentPosition.quantity - quantity;
          
          if (newQuantity > 0) {
            // Update position
            const { error: updateError } = await this.client
              .from('portfolio')
              .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', currentPosition.id);

            if (updateError) {
              throw new Error(`Failed to update position: ${updateError.message}`);
            }
          } else {
            // Remove position entirely
            const { error: deleteError } = await this.client
              .from('portfolio')
              .delete()
              .eq('id', currentPosition.id);

            if (deleteError) {
              throw new Error(`Failed to delete position: ${deleteError.message}`);
            }
          }
        } else {
          console.warn(`⚠️ Attempting to sell ${quantity} shares of ${symbol} but only ${currentPosition?.quantity || 0} available`);
        }
      }

      console.log(`✅ Portfolio updated successfully`);

    } catch (error) {
      console.error('❌ Error updating portfolio:', error);
      throw error;
    }
  }

  async updateAgentCash(agentId: string, cashChange: number): Promise<void> {
    try {
      const { error } = await this.client.rpc('update_agent_cash', {
        agent_id: agentId,
        cash_change: cashChange
      });

      if (error) {
        // Fallback: manual update
        const { data: agentData, error: fetchError } = await this.client
          .from('agents')
          .select('cash_available')
          .eq('id', agentId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch agent cash: ${fetchError.message}`);
        }

        const newCash = (agentData.cash_available || 100000) + cashChange;

        const { error: updateError } = await this.client
          .from('agents')
          .update({
            cash_available: newCash,
            updated_at: new Date().toISOString()
          })
          .eq('id', agentId);

        if (updateError) {
          throw new Error(`Failed to update agent cash: ${updateError.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Error updating agent cash:', error);
      throw error;
    }
  }

  async ensureAgent(agentId: string, name: string, strategy: string): Promise<void> {
    try {
      const { data: existingAgent, error: fetchError } = await this.client
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Agent doesn't exist, create it
        console.log(`🤖 Creating new agent: ${agentId}`);
        
        const { error: createError } = await this.client
          .from('agents')
          .insert({
            id: agentId,
            name: name,
            strategy: strategy,
            current_value: 100000,
            cash_available: 100000,
            total_return: 0,
            win_rate: 0,
            total_trades: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) {
          throw new Error(`Failed to create agent: ${createError.message}`);
        }
        
        console.log(`✅ Agent created successfully`);
      } else if (fetchError) {
        throw new Error(`Failed to fetch agent: ${fetchError.message}`);
      }

    } catch (error) {
      console.error('❌ Error ensuring agent exists:', error);
      throw error;
    }
  }
}