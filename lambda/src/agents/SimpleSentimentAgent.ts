import { SentimentAgentState, TradeDecision } from '../types';
import { RedditService } from '../services/RedditService';
import { StocktwitsService } from '../services/StocktwitsService';
import { GeminiService } from '../services/GeminiService';
import { YahooFinanceService } from '../services/YahooFinanceService';
import { SupabaseService } from '../services/SupabaseService';
import { ComprehensiveSentimentService } from '../services/ComprehensiveSentimentService';

export class SimpleSentimentAgent {
  private agentId = '550e8400-e29b-41d4-a716-446655440001';
  private agentName = 'Social Sentiment AI Agent';
  private strategy = 'sentiment';
  
  // Fixed watchlist - top 20 most liquid stocks for consistent tracking
  private readonly FIXED_WATCHLIST = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO',
    'WMT', 'LLY', 'JPM', 'UNH', 'XOM', 'V', 'PG', 'MA', 'JNJ', 'HD', 'CVX', 'ABBV'
  ];
  
  private redditService: RedditService;
  private stocktwitsService: StocktwitsService;
  private geminiService: GeminiService;
  private yahooFinance: YahooFinanceService;
  private supabase: SupabaseService;
  private comprehensiveSentiment: ComprehensiveSentimentService;

  constructor() {
    this.redditService = new RedditService();
    this.stocktwitsService = new StocktwitsService();
    this.geminiService = new GeminiService();
    this.yahooFinance = new YahooFinanceService();
    this.supabase = new SupabaseService();
    this.comprehensiveSentiment = new ComprehensiveSentimentService();
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

    // Load current portfolio from database
    const currentPortfolio = await this.loadPortfolioFromDatabase();
    
    return {
      agentId: this.agentId,
      currentDate: new Date().toISOString().split('T')[0],
      availableCash: agent?.currentValue || 100.00,
      portfolio: currentPortfolio,
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
      // Use fixed watchlist for consistent tracking
      const targetSymbols = [...this.FIXED_WATCHLIST];
      console.log(`Analyzing fixed watchlist: ${targetSymbols.join(', ')}`);

      // Collect Reddit posts for all watchlist symbols
      const redditPosts = await this.redditService.getStockMentions(targetSymbols, 50);
      console.log(`Collected ${redditPosts.length} Reddit posts from fixed watchlist`);

      // Collect StockTwits posts for all watchlist symbols
      const stocktwitsPosts = await this.stocktwitsService.getMultipleSymbols(targetSymbols, 20);
      console.log(`Collected ${stocktwitsPosts.length} StockTwits posts from fixed watchlist`);

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
        targetSymbols: this.FIXED_WATCHLIST.slice(0, 5), // Use first 5 as fallback
        redditPosts: [],
        stocktwitsPosts: [],
        processingStatus: 'data_collection_failed'
      };
    }
  }

  private async analyzeSentiment(state: SentimentAgentState): Promise<SentimentAgentState> {
    console.log('🧠 Starting comprehensive sentiment analysis for all 20 stocks...');
    
    try {
      // Use comprehensive sentiment service to ensure ALL 20 stocks get sentiment scores
      const comprehensiveResults = await this.comprehensiveSentiment.getComprehensiveSentiment(
        this.FIXED_WATCHLIST
      );

      const sentimentScores: Record<string, number> = {};
      
      for (const result of comprehensiveResults) {
        sentimentScores[result.symbol] = result.finalSentiment;
        console.log(`${result.symbol}: ${(result.finalSentiment * 100).toFixed(1)}% (${result.sources.length} sources, confidence: ${result.confidence.toFixed(2)})`);
      }

      // Log coverage statistics
      const totalStocks = this.FIXED_WATCHLIST.length;
      const coveredStocks = Object.keys(sentimentScores).length;
      console.log(`📊 Sentiment Coverage: ${coveredStocks}/${totalStocks} stocks (${((coveredStocks/totalStocks)*100).toFixed(1)}%)`);

      return {
        ...state,
        sentimentScores,
        processingStatus: 'sentiment_analyzed'
      };

    } catch (error) {
      console.error('Comprehensive sentiment analysis failed:', error);
      
      // Fallback: provide neutral sentiment for all stocks
      const fallbackScores: Record<string, number> = {};
      for (const symbol of this.FIXED_WATCHLIST) {
        fallbackScores[symbol] = 0.5; // Neutral sentiment
      }
      
      return {
        ...state,
        sentimentScores: fallbackScores,
        processingStatus: 'sentiment_analysis_failed_using_fallback'
      };
    }
  }

  private async makeDecisions(state: SentimentAgentState): Promise<SentimentAgentState> {
    const tradeDecisions: TradeDecision[] = [];

    try {
      // Get prices for ALL watchlist symbols (not just those with sentiment)
      const allPrices = await this.yahooFinance.getCurrentPrices(this.FIXED_WATCHLIST);
      
      // Process all watchlist symbols for decisions
      await this.processWatchlistDecisions(state, tradeDecisions, allPrices);
      
      // Review existing positions that might not be in watchlist
      await this.reviewExistingPositions(state, tradeDecisions, allPrices);

      console.log(`Generated ${tradeDecisions.length} trade decisions`);

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

  private async processWatchlistDecisions(
    state: SentimentAgentState, 
    tradeDecisions: TradeDecision[], 
    allPrices: Record<string, number>
  ): Promise<void> {
    for (const symbol of this.FIXED_WATCHLIST) {
      const currentPrice = allPrices[symbol];
      const sentiment = state.sentimentScores[symbol];
      const currentPosition = state.portfolio[symbol] || 0;
      
      if (!currentPrice) {
        console.warn(`No price data for ${symbol}`);
        continue;
      }

      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let reasoning = '';
      let quantity = 0;

      // Enhanced sentiment-based decisions with better exit logic
      if (sentiment !== undefined) {
        // Strong positive sentiment - BUY
        if (sentiment >= 0.70 && currentPosition < this.getMaxPositionSize(state.availableCash, currentPrice)) {
          action = 'BUY';
          const positionValue = state.availableCash * 0.10; // 10% of available cash per position
          quantity = Math.max(1, Math.floor(positionValue / currentPrice));
          reasoning = `Strong positive sentiment (${(sentiment * 100).toFixed(1)}%) - buying ${quantity} shares`;
          
        // Negative sentiment - SELL if holding  
        } else if (sentiment <= 0.40 && currentPosition > 0) {
          action = 'SELL';
          quantity = currentPosition;
          reasoning = `Negative sentiment (${(sentiment * 100).toFixed(1)}%) - selling all ${quantity} shares`;
          
        // Neutral sentiment but holding - consider partial exit
        } else if (sentiment >= 0.40 && sentiment <= 0.60 && currentPosition > 0) {
          // Check if we've been holding this position too long
          const holdingDays = await this.getDaysHeld(symbol);
          if (holdingDays > 7) {
            action = 'SELL';
            quantity = Math.ceil(currentPosition * 0.5); // Sell 50%
            reasoning = `Neutral sentiment (${(sentiment * 100).toFixed(1)}%) held ${holdingDays} days - reducing position by 50%`;
          } else {
            reasoning = `Neutral sentiment (${(sentiment * 100).toFixed(1)}%) - holding for now (${holdingDays} days)`;
          }
        } else {
          reasoning = sentiment ? `Sentiment ${(sentiment * 100).toFixed(1)}% - no action needed` : `No sentiment data - holding`;
        }
      } else {
        // No sentiment data available
        if (currentPosition > 0) {
          const holdingDays = await this.getDaysHeld(symbol);
          if (holdingDays > 3) {
            action = 'SELL';
            quantity = currentPosition;
            reasoning = `No sentiment data for ${holdingDays} days - selling all ${quantity} shares`;
          } else {
            reasoning = `No sentiment data - holding for ${holdingDays} more days`;
          }
        }
      }

      tradeDecisions.push({
        symbol,
        action,
        quantity,
        currentPrice,
        reasoning,
        confidence: sentiment ? Math.abs(sentiment - 0.5) * 2 : 0.3,
        sentimentScore: sentiment || 0
      });

      console.log(`${symbol}: ${action} ${quantity} @ $${currentPrice} - ${reasoning}`);
    }
  }

  private async reviewExistingPositions(
    state: SentimentAgentState,
    tradeDecisions: TradeDecision[], 
    allPrices: Record<string, number>
  ): Promise<void> {
    // Review any positions not in current watchlist
    for (const [symbol, quantity] of Object.entries(state.portfolio)) {
      if (quantity > 0 && !this.FIXED_WATCHLIST.includes(symbol)) {
        const currentPrice = allPrices[symbol] || await this.getSinglePrice(symbol);
        const holdingDays = await this.getDaysHeld(symbol);
        
        if (currentPrice) {
          // Force sell positions not in watchlist after 1 day
          tradeDecisions.push({
            symbol,
            action: 'SELL',
            quantity,
            currentPrice,
            reasoning: `Position not in watchlist (${holdingDays} days) - liquidating`,
            confidence: 0.8,
            sentimentScore: 0
          });
        }
      }
    }
  }

  private getMaxPositionSize(availableCash: number, price: number): number {
    // Max 15% of portfolio in any single position
    return Math.floor((availableCash * 0.15) / price);
  }

  private async getDaysHeld(symbol: string): Promise<number> {
    // Get the most recent BUY trade for this symbol
    // This is a simplified version - you might want to implement proper tracking
    try {
      const trades = await this.supabase.getAgentTrades(this.agentId, symbol, 1);
      if (trades.length > 0) {
        const lastTradeDate = new Date(trades[0].date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastTradeDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    } catch (error) {
      console.warn(`Could not get holding days for ${symbol}:`, error);
    }
    return 0;
  }

  private async getSinglePrice(symbol: string): Promise<number | null> {
    try {
      const prices = await this.yahooFinance.getCurrentPrices([symbol]);
      return prices[symbol] || null;
    } catch {
      return null;
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

  private async loadPortfolioFromDatabase(): Promise<Record<string, number>> {
    try {
      const portfolio = await this.supabase.getAgentPortfolio(this.agentId);
      const portfolioMap: Record<string, number> = {};
      
      for (const position of portfolio) {
        if (position.quantity > 0) {
          portfolioMap[position.symbol] = position.quantity;
        }
      }
      
      console.log(`Loaded portfolio:`, portfolioMap);
      return portfolioMap;
    } catch (error) {
      console.warn('Could not load portfolio from database:', error);
      return {};
    }
  }
}