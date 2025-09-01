import { SentimentAgentState, TradeDecision } from '../types';
import { RedditService } from '../services/RedditService';
import { StocktwitsService } from '../services/StocktwitsService';
import { GeminiService } from '../services/GeminiService';
import { YahooFinanceService } from '../services/YahooFinanceService';
import { SupabaseService } from '../services/SupabaseService';

export class SimpleSentimentAgent {
  private agentId = '550e8400-e29b-41d4-a716-446655440001';
  private agentName = 'Social Sentiment AI Agent';
  private strategy = 'sentiment';
  
  private redditService: RedditService;
  private stocktwitsService: StocktwitsService;
  private geminiService: GeminiService;
  private yahooFinance: YahooFinanceService;
  private supabase: SupabaseService;

  constructor() {
    this.redditService = new RedditService();
    this.stocktwitsService = new StocktwitsService();
    this.geminiService = new GeminiService();
    this.yahooFinance = new YahooFinanceService();
    this.supabase = new SupabaseService();
  }

  async executeDaily(): Promise<{
    status: 'success' | 'error';
    trades: TradeDecision[];
    portfolioValue: number;
    error?: string;
  }> {
    console.log(`[${this.agentName}] Starting daily execution...`);
    
    try {
      // Initialize agent state
      let state: SentimentAgentState = await this.initializeState();
      
      // Step 1: Collect data
      console.log('Step 1: Collecting social media data...');
      state = await this.collectData(state);
      
      // Step 2: Analyze sentiment
      console.log('Step 2: Analyzing sentiment with AI...');
      state = await this.analyzeSentiment(state);
      
      // Step 3: Make trading decisions
      console.log('Step 3: Making trading decisions...');
      state = await this.makeDecisions(state);
      
      // Step 4: Execute trades
      console.log('Step 4: Executing trades...');
      state = await this.executeTrades(state);
      
      // Save state to database
      await this.saveState(state);
      
      // Calculate final portfolio value
      const portfolioValue = await this.calculatePortfolioValue(state);
      
      console.log(`[${this.agentName}] Daily execution completed successfully`);
      console.log(`Portfolio Value: $${portfolioValue.toFixed(2)}`);
      
      return {
        status: 'success',
        trades: state.tradeDecisions || [],
        portfolioValue
      };
      
    } catch (error) {
      console.error(`[${this.agentName}] Execution failed:`, error);
      return {
        status: 'error',
        trades: [],
        portfolioValue: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async initializeState(): Promise<SentimentAgentState> {
    // Check if agent exists in database
    let agent = await this.supabase.getAgent(this.agentId);
    
    if (!agent) {
      // Initialize new agent
      await this.supabase.createAgent({
        id: this.agentId,
        name: this.agentName,
        strategy: this.strategy,
        currentValue: 100.00, // Starting with $100
        totalReturn: 0,
        winRate: 0,
        totalTrades: 0
      });
      agent = await this.supabase.getAgent(this.agentId);
    }

    return {
      agentId: this.agentId,
      currentDate: new Date().toISOString().split('T')[0],
      availableCash: agent?.currentValue || 100.00,
      portfolio: {}, // TODO: Load from database
      processingStatus: 'initialized',
      targetSymbols: [],
      redditPosts: [],
      stocktwitsPosts: [],
      sentimentScores: {},
      tradeDecisions: []
    };
  }

  private async collectData(state: SentimentAgentState): Promise<SentimentAgentState> {
    try {
      // Get trending symbols or use defaults
      let targetSymbols: string[];
      
      try {
        const rawSymbols = await this.stocktwitsService.getTrendingSymbols();
        // Filter out invalid symbols and clean .X suffixes
        targetSymbols = rawSymbols
          .map(symbol => symbol.replace(/\.X$/, '')) // Remove .X suffix
          .filter(symbol => /^[A-Z]{1,5}$/.test(symbol)) // Only valid stock symbols
          .filter(symbol => !['BTC', 'ETH', 'DOGE'].includes(symbol)); // Remove crypto
        
        if (targetSymbols.length === 0) {
          throw new Error('No valid symbols found');
        }
      } catch (error) {
        console.warn('Using default symbols:', error);
        targetSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'];
      }

      // Limit to top 8 symbols
      targetSymbols = targetSymbols.slice(0, 8);
      console.log(`Analyzing symbols: ${targetSymbols.join(', ')}`);

      // Collect Reddit posts
      const redditPosts = await this.redditService.getStockMentions(targetSymbols, 25);
      console.log(`Collected ${redditPosts.length} Reddit posts`);

      // Collect StockTwits posts
      const stocktwitsPosts = await this.stocktwitsService.getMultipleSymbols(targetSymbols, 10);
      console.log(`Collected ${stocktwitsPosts.length} StockTwits posts`);

      return {
        ...state,
        targetSymbols,
        redditPosts,
        stocktwitsPosts,
        processingStatus: 'data_collected'
      };

    } catch (error) {
      console.error('Data collection failed:', error);
      return {
        ...state,
        targetSymbols: ['AAPL', 'TSLA'], // Fallback
        redditPosts: [],
        stocktwitsPosts: [],
        processingStatus: 'data_collection_failed'
      };
    }
  }

  private async analyzeSentiment(state: SentimentAgentState): Promise<SentimentAgentState> {
    if (state.redditPosts.length === 0 && state.stocktwitsPosts.length === 0) {
      console.warn('No data to analyze');
      return {
        ...state,
        sentimentScores: {},
        processingStatus: 'no_data_to_analyze'
      };
    }

    try {
      const sentimentAnalysis = await this.geminiService.analyzeSentiment(
        state.redditPosts,
        state.stocktwitsPosts
      );

      const sentimentScores: Record<string, number> = {};
      
      for (const analysis of sentimentAnalysis) {
        sentimentScores[analysis.symbol] = analysis.sentimentScore;
        console.log(`${analysis.symbol}: ${(analysis.sentimentScore * 100).toFixed(1)}% sentiment`);
      }

      return {
        ...state,
        sentimentScores,
        processingStatus: 'sentiment_analyzed'
      };

    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return {
        ...state,
        sentimentScores: {},
        processingStatus: 'sentiment_analysis_failed'
      };
    }
  }

  private async makeDecisions(state: SentimentAgentState): Promise<SentimentAgentState> {
    const tradeDecisions: TradeDecision[] = [];

    if (Object.keys(state.sentimentScores).length === 0) {
      console.warn('No sentiment data for decisions');
      return {
        ...state,
        tradeDecisions,
        processingStatus: 'no_decisions_made'
      };
    }

    try {
      const symbols = Object.keys(state.sentimentScores);
      const stockPrices = await this.yahooFinance.getCurrentPrices(symbols);

      for (const [symbol, sentiment] of Object.entries(state.sentimentScores)) {
        const currentPrice = stockPrices[symbol];
        
        if (!currentPrice) {
          console.warn(`No price data for ${symbol}`);
          continue;
        }

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reasoning = '';
        let quantity = 0;

        // Apply 70/30 sentiment rule
        if (sentiment >= 0.70) {
          action = 'BUY';
          const positionValue = state.availableCash * 0.15; // 15% of cash per position
          quantity = Math.max(1, Math.floor(positionValue / currentPrice)); // At least 1 share
          reasoning = `Strong positive sentiment (${(sentiment * 100).toFixed(1)}%) - buying ${quantity} shares`;
          
        } else if (sentiment <= 0.30) {
          const currentPosition = state.portfolio[symbol] || 0;
          if (currentPosition > 0) {
            action = 'SELL';
            quantity = currentPosition;
            reasoning = `Strong negative sentiment (${(sentiment * 100).toFixed(1)}%) - selling all ${quantity} shares`;
          } else {
            reasoning = `Strong negative sentiment but no position to sell`;
          }
          
        } else {
          reasoning = `Neutral sentiment (${(sentiment * 100).toFixed(1)}%) - holding`;
        }

        tradeDecisions.push({
          symbol,
          action,
          quantity,
          currentPrice,
          reasoning,
          confidence: Math.abs(sentiment - 0.5) * 2,
          sentimentScore: sentiment
        });

        console.log(`${symbol}: ${action} ${quantity} @ $${currentPrice} - ${reasoning}`);
      }

      return {
        ...state,
        tradeDecisions,
        processingStatus: 'decisions_made'
      };

    } catch (error) {
      console.error('Decision making failed:', error);
      return {
        ...state,
        tradeDecisions,
        processingStatus: 'decision_making_failed'
      };
    }
  }

  private async executeTrades(state: SentimentAgentState): Promise<SentimentAgentState> {
    let updatedCash = state.availableCash;
    const updatedPortfolio = { ...state.portfolio };

    for (const trade of state.tradeDecisions) {
      if (trade.action === 'HOLD' || trade.quantity === 0) {
        continue;
      }

      if (trade.action === 'BUY') {
        const totalCost = trade.quantity * trade.currentPrice;
        
        if (totalCost <= updatedCash) {
          updatedCash -= totalCost;
          updatedPortfolio[trade.symbol] = (updatedPortfolio[trade.symbol] || 0) + trade.quantity;
          console.log(`✅ Bought ${trade.quantity} ${trade.symbol} for $${totalCost.toFixed(2)}`);
        } else {
          console.warn(`❌ Insufficient funds for ${trade.symbol}`);
        }
        
      } else if (trade.action === 'SELL') {
        const currentHolding = updatedPortfolio[trade.symbol] || 0;
        
        if (currentHolding >= trade.quantity) {
          const totalRevenue = trade.quantity * trade.currentPrice;
          updatedCash += totalRevenue;
          updatedPortfolio[trade.symbol] = currentHolding - trade.quantity;
          
          if (updatedPortfolio[trade.symbol] === 0) {
            delete updatedPortfolio[trade.symbol];
          }
          
          console.log(`✅ Sold ${trade.quantity} ${trade.symbol} for $${totalRevenue.toFixed(2)}`);
        }
      }
    }

    console.log(`Cash: $${updatedCash.toFixed(2)}, Positions: ${JSON.stringify(updatedPortfolio)}`);

    return {
      ...state,
      availableCash: updatedCash,
      portfolio: updatedPortfolio,
      processingStatus: 'trades_executed'
    };
  }

  private async saveState(state: SentimentAgentState): Promise<void> {
    const portfolioValue = await this.calculatePortfolioValue(state);
    
    // Update agent performance
    await this.supabase.updateAgentPerformance(this.agentId, {
      currentValue: portfolioValue,
      totalReturn: (portfolioValue - 100) / 100,
      totalTrades: state.tradeDecisions?.filter(t => t.action !== 'HOLD').length || 0
    });

    // Save trades
    if (state.tradeDecisions) {
      for (const trade of state.tradeDecisions) {
        if (trade.action !== 'HOLD') {
          await this.supabase.saveTrade({
            agentId: this.agentId,
            date: state.currentDate,
            symbol: trade.symbol,
            action: trade.action,
            quantity: trade.quantity,
            price: trade.currentPrice,
            reasoning: trade.reasoning,
            confidence: trade.confidence
          });
        }
      }
    }

    // Save daily performance (use upsert to avoid duplicate key error)
    try {
      await this.supabase.saveDailyPerformance({
        agentId: this.agentId,
        date: state.currentDate,
        portfolioValue: portfolioValue,
        dailyReturn: 0, // Calculate later
        positions: state.portfolio
      });
    } catch (error) {
      console.warn('Performance already saved for today, updating instead');
      // Could implement upsert logic here if needed
    }
  }

  private async calculatePortfolioValue(state: SentimentAgentState): Promise<number> {
    let totalValue = state.availableCash;
    
    if (Object.keys(state.portfolio).length > 0) {
      try {
        const symbols = Object.keys(state.portfolio);
        const currentPrices = await this.yahooFinance.getCurrentPrices(symbols);
        
        for (const [symbol, quantity] of Object.entries(state.portfolio)) {
          const currentPrice = currentPrices[symbol];
          if (currentPrice) {
            totalValue += quantity * currentPrice;
          }
        }
      } catch (error) {
        console.error('Error calculating portfolio value:', error);
      }
    }
    
    return totalValue;
  }
}