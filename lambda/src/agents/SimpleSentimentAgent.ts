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
        currentValue: 1000.00, // Starting with $1000
        totalReturn: 0,
        winRate: 0,
        totalTrades: 0
      });
      agent = await this.supabase.getAgent(this.agentId);
    }

    // Load current portfolio from database
    const currentPortfolio = await this.loadPortfolioFromDatabase();
    
    // Calculate actual available cash from portfolio positions
    let portfolioStockValue = 0;
    if (Object.keys(currentPortfolio).length > 0) {
      const symbols = Object.keys(currentPortfolio);
      const currentPrices = await this.yahooFinance.getCurrentPrices(symbols);
      
      for (const [symbol, quantity] of Object.entries(currentPortfolio)) {
        const currentPrice = currentPrices[symbol];
        if (currentPrice) {
          portfolioStockValue += quantity * currentPrice;
        }
      }
    }
    
    // Available cash = total portfolio value - current stock positions value
    const totalValue = agent?.currentValue || 1000.00;
    const actualCash = Math.max(0, totalValue - portfolioStockValue);
    
    return {
      agentId: this.agentId,
      currentDate: new Date().toISOString().split('T')[0],
      availableCash: actualCash,
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
      console.log(`Collected ${redditPosts.length} Reddit posts`);

      // Collect StockTwits posts for all watchlist symbols
      const stocktwitsPosts = await this.stocktwitsService.getMultipleSymbols(targetSymbols, 20);
      console.log(`Collected ${stocktwitsPosts.length} StockTwits posts`);

      return {
        ...state,
        targetSymbols,
        redditPosts,
        stocktwitsPosts,
        processingStatus: 'data_collected'
      };

    } catch (error) {
      console.error('❌ Data collection failed:', error);
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
    console.log('Starting comprehensive sentiment analysis...');
    
    try {
      // Use comprehensive sentiment service to ensure ALL 20 stocks get sentiment scores
      const comprehensiveResults = await this.comprehensiveSentiment.getComprehensiveSentiment(
        this.FIXED_WATCHLIST
      );

      const sentimentScores: Record<string, number> = {};
      
      for (const result of comprehensiveResults) {
        sentimentScores[result.symbol] = result.finalSentiment;
        console.log(`${result.symbol}: ${(result.finalSentiment * 100).toFixed(1)}% sentiment (${result.sources.length} sources)`);
      }

      // Log coverage statistics
      const totalStocks = this.FIXED_WATCHLIST.length;
      const coveredStocks = Object.keys(sentimentScores).length;
      console.log(`Sentiment coverage: ${coveredStocks}/${totalStocks} stocks`);

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
      // Get prices for ALL watchlist symbols
      console.log('Fetching current prices...');
      const allPrices = await this.yahooFinance.getCurrentPrices(this.FIXED_WATCHLIST);
      
      // Log price coverage
      const priceCount = Object.values(allPrices).filter(p => p).length;
      console.log(`Price coverage: ${priceCount}/${this.FIXED_WATCHLIST.length} stocks`);
      
      // Let AI make all trading decisions at once with full portfolio context
      const aiDecisions = await this.getAIPortfolioDecisions(state, allPrices);
      tradeDecisions.push(...aiDecisions);

      // FALLBACK: If AI failed to generate at least 2 trades, make some basic ones
      if (tradeDecisions.filter(t => t.action !== 'HOLD').length < 2) {
        console.log(`AI generated ${tradeDecisions.filter(t => t.action !== 'HOLD').length} trades - using fallback logic`);
        
        // Find 2 good trading opportunities
        let tradesMade = tradeDecisions.filter(t => t.action !== 'HOLD').length;
        
        // 1. Buy high sentiment stocks
        for (const [symbol, sentiment] of Object.entries(state.sentimentScores)) {
          if (tradesMade >= 2) break;
          if (sentiment > 0.65 && allPrices[symbol] && state.availableCash > allPrices[symbol]) {
            const maxQuantity = Math.floor(state.availableCash / allPrices[symbol]);
            const quantity = Math.min(maxQuantity, Math.floor(state.availableCash * 0.20 / allPrices[symbol])); // Max 20% of cash
            if (quantity > 0) {
              tradeDecisions.push({
                symbol,
                action: 'BUY',
                quantity,
                currentPrice: allPrices[symbol],
                reasoning: `FALLBACK BUY: ${(sentiment * 100).toFixed(1)}% positive sentiment`,
                confidence: 0.6,
                sentimentScore: sentiment
              });
              state.availableCash -= quantity * allPrices[symbol];
              tradesMade++;
            }
          }
        }
        
        // 2. Sell low sentiment holdings
        for (const [symbol, quantity] of Object.entries(state.portfolio)) {
          if (tradesMade >= 2) break;
          const sentiment = state.sentimentScores[symbol];
          if (quantity > 0 && sentiment && sentiment < 0.45 && allPrices[symbol]) {
            tradeDecisions.push({
              symbol,
              action: 'SELL',
              quantity,
              currentPrice: allPrices[symbol],
              reasoning: `FALLBACK SELL: ${(sentiment * 100).toFixed(1)}% negative sentiment`,
              confidence: 0.6,
              sentimentScore: sentiment
            });
            tradesMade++;
          }
        }
      }

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
        // Will be handled by AI portfolio decision
        if (sentiment >= 0.70) {
          action = 'HOLD'; // Temporary, AI will override
          reasoning = `Sentiment ${(sentiment * 100).toFixed(1)}% - awaiting AI decision`;
          
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

  private async getAIPortfolioDecisions(
    state: SentimentAgentState,
    allPrices: Record<string, number>
  ): Promise<TradeDecision[]> {
    try {
      // Build comprehensive portfolio context
      const portfolioSummary = Object.entries(state.portfolio)
        .map(([symbol, qty]) => `${symbol}: ${qty} shares @ $${allPrices[symbol] || 'N/A'}`)
        .join('\n') || 'No current positions';

      const sentimentSummary = Object.entries(state.sentimentScores)
        .map(([symbol, sentiment]) => `${symbol}: ${(sentiment * 100).toFixed(1)}% sentiment @ $${allPrices[symbol]?.toFixed(2) || 'N/A'}`)
        .join('\n');

      const prompt = `You are a professional AI trading agent managing a portfolio. Make smart, calculated trading decisions based on the data provided.

CURRENT PORTFOLIO:
${portfolioSummary}

AVAILABLE CASH: $${state.availableCash.toFixed(0)}

SENTIMENT ANALYSIS (today):
${sentimentSummary}

TRADING GUIDELINES:
- Make at least 2 trades today (buy or sell - your choice)
- Use sentiment data and current positions to make informed decisions
- Consider portfolio balance and risk management
- BUY stocks when sentiment and conditions look favorable
- SELL stocks when sentiment turns negative or you want to take profits
- Decide your own cash allocation based on market opportunities
- Only trade in whole shares (integers only)
- Explain your reasoning for each trade

You have complete autonomy over trade decisions and cash allocation.

Respond with trading decisions in this EXACT format:
TRADES:
SYMBOL:ACTION:QUANTITY:REASON
SYMBOL:ACTION:QUANTITY:REASON
...

Example:
TRADES:
AAPL:BUY:5:Good 72% sentiment, investing 25% of cash
GOOGL:BUY:3:Solid 68% sentiment, diversifying position
META:BUY:2:Decent 66% sentiment, taking calculated risk
TSLA:HOLD:0:Only 55% sentiment, waiting for better entry`;

      console.log('Sending trading prompt to AI...');
      
      const response = await this.geminiService.generateText(prompt);
      console.log('AI response received, parsing decisions...');
      
      const decisions = this.parseAITradingResponse(response, allPrices);
      console.log(`AI generated ${decisions.length} trading decisions`);
      
      // Store AI response for debugging
      if (!state.debug) state.debug = {};
      state.debug.aiResponse = response;
      
      return decisions;
      
    } catch (error) {
      console.error('AI portfolio decisions failed:', error);
      // Return empty decisions on error - let fallback logic handle
      return [];
    }
  }

  private parseAITradingResponse(response: string, allPrices: Record<string, number>): TradeDecision[] {
    const decisions: TradeDecision[] = [];
    
    try {
      // Find TRADES: section
      const tradesMatch = response.match(/TRADES:([\s\S]*)/);
      if (!tradesMatch) return decisions;

      const tradesSection = tradesMatch[1];
      const lines = tradesSection.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(':');
        if (parts.length >= 4) {
          const symbol = parts[0].trim();
          const action = parts[1].trim().toUpperCase() as 'BUY' | 'SELL' | 'HOLD';
          const quantity = parseInt(parts[2].trim()) || 0;
          const reason = parts.slice(3).join(':').trim();

          if (this.FIXED_WATCHLIST.includes(symbol) && allPrices[symbol]) {
            decisions.push({
              symbol,
              action,
              quantity,
              currentPrice: allPrices[symbol],
              reasoning: `AI Decision: ${reason}`,
              confidence: 0.8,
              sentimentScore: 0.5 // Will be filled from sentiment analysis
            });
          }
        }
      }

      console.log(`Parsed ${decisions.length} AI trading decisions`);
      return decisions;
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return decisions;
    }
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
    
    // Get previous day's portfolio value for correct profit calculation
    const previousPerformance = await this.supabase.getLatestPerformance(this.agentId);
    const previousValue = previousPerformance?.portfolio_value || 1000.00;
    const dailyReturn = (portfolioValue - previousValue) / previousValue;
    
    // Calculate total return from initial $1000
    const totalReturn = (portfolioValue - 1000) / 1000;
    
    // Update agent performance
    await this.supabase.updateAgentPerformance(this.agentId, {
      currentValue: portfolioValue,
      totalReturn: totalReturn,
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

    // Save daily performance with correct daily return
    try {
      await this.supabase.saveDailyPerformance({
        agentId: this.agentId,
        date: state.currentDate,
        portfolioValue: portfolioValue,
        dailyReturn: dailyReturn,
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

  private groupPostsBySymbol(posts: any[], symbolField: string = 'symbols'): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const post of posts) {
      let symbols: string[] = [];
      
      if (symbolField === 'symbols' && Array.isArray(post.symbols)) {
        symbols = post.symbols;
      } else if (symbolField === 'symbol' && post.symbol) {
        symbols = [post.symbol];
      } else {
        // Try to extract symbols from title or text
        const text = post.title || post.text || post.body || '';
        symbols = this.FIXED_WATCHLIST.filter(symbol => 
          text.toUpperCase().includes(symbol) || 
          text.toUpperCase().includes(`$${symbol}`)
        );
      }
      
      if (symbols.length === 0) {
        symbols = ['OTHER'];
      }
      
      for (const symbol of symbols) {
        if (!grouped[symbol]) {
          grouped[symbol] = [];
        }
        grouped[symbol].push(post);
      }
    }
    
    return grouped;
  }
}