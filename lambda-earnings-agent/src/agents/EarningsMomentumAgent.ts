import { EarningsDataService } from '../services/EarningsDataService';
import { NewsAnalysisService } from '../services/NewsAnalysisService';
import { YahooFinanceService } from '../services/YahooFinanceService';
import { GeminiService } from '../services/GeminiService';
import { SupabaseService } from '../services/SupabaseService';
import { EarningsAnalysis, TradingDecision, Trade, Portfolio } from '../types';

export class EarningsMomentumAgent {
  private readonly agentId = '550e8400-e29b-41d4-a716-446655440002';
  private readonly agentName = 'Earnings Momentum AI Agent';
  private readonly strategy = 'earnings-momentum';

  private earningsService: EarningsDataService;
  private newsService: NewsAnalysisService;
  private yahooService: YahooFinanceService;
  private geminiService: GeminiService;
  private supabaseService: SupabaseService;

  constructor() {
    console.log('🤖 Initializing Earnings Momentum AI Agent');
    
    this.earningsService = new EarningsDataService();
    this.newsService = new NewsAnalysisService();
    this.yahooService = new YahooFinanceService();
    this.geminiService = new GeminiService();
    this.supabaseService = new SupabaseService();

    console.log('✅ Earnings Momentum Agent initialized successfully');
  }

  async executeDaily(): Promise<{
    success: boolean;
    tradesExecuted: number;
    totalValue?: number;
    error?: string;
    summary: string;
  }> {
    try {
      console.log('🚀 Starting Earnings Momentum Agent Daily Execution');
      console.log(`📅 Execution Time: ${new Date().toISOString()}`);

      // Step 1: Ensure agent exists in database
      await this.supabaseService.ensureAgent(this.agentId, this.agentName, this.strategy);

      // Step 2: Collect earnings and market data
      console.log('\n📊 Step 1: Collecting Earnings Data');
      const upcomingEarnings = await this.earningsService.getUpcomingEarnings(7);
      const upcomingIPOs = await this.earningsService.getUpcomingIPOs(14);
      
      console.log(`📈 Found ${upcomingEarnings.length} upcoming earnings events`);
      console.log(`🎯 Found ${upcomingIPOs.length} upcoming IPOs`);

      // Step 3: Perform comprehensive earnings analysis
      console.log('\n🔍 Step 2: Performing Earnings Analysis');
      const earningsAnalyses: EarningsAnalysis[] = [];
      
      // Focus on top 5 earnings opportunities to avoid analysis overload
      const topEarnings = upcomingEarnings.slice(0, 5);
      
      // Log IPO information for context (IPOs could be future enhancement)
      if (upcomingIPOs.length > 0) {
        console.log(`📈 IPO Context: ${upcomingIPOs.length} IPOs available for future analysis`);
        upcomingIPOs.slice(0, 3).forEach(ipo => {
          console.log(`🎯 ${ipo.symbol} - ${ipo.company} (${ipo.date})`);
        });
      }
      
      for (const earning of topEarnings) {
        try {
          console.log(`📋 Analyzing ${earning.symbol} - ${earning.company}`);
          
          // Get historical earnings data
          const historicalData = await this.earningsService.getHistoricalEarnings(earning.symbol, 8);
          
          // Get news sentiment
          const newsSentiment = await this.newsService.analyzeNewsSentiment(earning.symbol);
          
          // Get technical indicators
          const technicalData = await this.yahooService.getTechnicalIndicators(earning.symbol);
          
          // Calculate average surprise and price impact
          const avgSurprise = historicalData.length > 0 
            ? historicalData.reduce((sum, h) => sum + h.surprise, 0) / historicalData.length
            : 0;
            
          const avgPriceImpact = historicalData.length > 0 
            ? historicalData.reduce((sum, h) => sum + Math.abs(h.priceChangePost), 0) / historicalData.length
            : 0;

          const analysis: EarningsAnalysis = {
            symbol: earning.symbol,
            company: earning.company,
            upcomingEarnings: earning,
            historicalPerformance: historicalData,
            averageSurprise: avgSurprise,
            averagePriceImpact: avgPriceImpact,
            sentiment: {
              newsScore: (newsSentiment.overallSentiment + 1) * 5, // Convert -1,1 to 0-10 scale
              analystRating: this.determineAnalystRating(newsSentiment.overallSentiment),
              priceTargets: {
                high: 120 + Math.random() * 80,
                low: 80 + Math.random() * 40,
                average: 100 + Math.random() * 20
              }
            },
            technicalIndicators: technicalData
          };

          earningsAnalyses.push(analysis);
          
          console.log(`✅ ${earning.symbol} analysis complete - Avg Surprise: ${avgSurprise.toFixed(2)}%, News Sentiment: ${analysis.sentiment.newsScore.toFixed(1)}/10`);
          
        } catch (error) {
          console.error(`❌ Error analyzing ${earning.symbol}:`, error);
        }
        
        // Small delay to avoid overwhelming APIs
        await this.delay(500);
      }

      // Step 4: Get current portfolio and recent trades
      console.log('\n💼 Step 3: Fetching Portfolio & Trade History');
      const portfolio = await this.supabaseService.getAgentPortfolio(this.agentId);
      const recentTrades = await this.supabaseService.getAgentTrades(this.agentId, undefined, 10);
      
      console.log(`💰 Portfolio: $${portfolio.cash_available.toLocaleString()} cash, ${Object.keys(portfolio.positions).length} positions`);
      console.log(`📋 Recent trades: ${recentTrades.length} trades found`);

      // Step 5: AI Trading Decisions
      console.log('\n🤖 Step 4: AI Making Trading Decisions');
      
      if (earningsAnalyses.length === 0) {
        throw new Error('No earnings analyses available for trading decisions');
      }
      
      const tradingDecisions = await this.geminiService.makeEarningsTradingDecisions(
        earningsAnalyses,
        portfolio,
        recentTrades
      );

      console.log(`🎯 AI Generated ${tradingDecisions.length} trading decisions`);

      // Step 6: Execute trades
      console.log('\n💰 Step 5: Executing Trades');
      
      if (tradingDecisions.length < 2) {
        // Ensure minimum 2 trades - add a conservative trade if needed
        console.log('⚠️ Less than 2 trades generated, adding fallback trades');
        const fallbackTrades = await this.generateFallbackTrades(earningsAnalyses, portfolio);
        tradingDecisions.push(...fallbackTrades);
      }

      let tradesExecuted = 0;
      const executedTrades: Trade[] = [];

      for (const decision of tradingDecisions.slice(0, 5)) { // Limit to 5 trades max
        try {
          const currentPrice = await this.yahooService.getCurrentPrice(decision.symbol);
          
          if (!currentPrice) {
            console.warn(`⚠️ Cannot get price for ${decision.symbol}, skipping trade`);
            continue;
          }

          const trade: Trade = {
            agent_id: this.agentId,
            symbol: decision.symbol,
            action: decision.action,
            quantity: decision.quantity,
            price: currentPrice,
            total_value: decision.quantity * currentPrice,
            reason: decision.reasoning,
            confidence_score: decision.confidence,
            executed_at: new Date().toISOString(),
            strategy: this.strategy
          };

          // Validate trade (cash availability, position size, etc.)
          const isValid = await this.validateTrade(trade, portfolio);
          
          if (!isValid) {
            console.warn(`⚠️ Trade validation failed for ${trade.symbol}, skipping`);
            continue;
          }

          // Execute trade
          await this.executeTrade(trade);
          executedTrades.push(trade);
          tradesExecuted++;
          
          console.log(`✅ Trade executed: ${trade.action} ${trade.quantity} ${trade.symbol} @ $${trade.price.toFixed(2)} (Total: $${trade.total_value.toFixed(2)})`);
          
        } catch (error) {
          console.error(`❌ Error executing trade for ${decision.symbol}:`, error);
        }
      }

      // Step 7: Calculate final results
      const updatedPortfolio = await this.supabaseService.getAgentPortfolio(this.agentId);
      
      const summary = this.generateExecutionSummary(
        earningsAnalyses,
        executedTrades,
        updatedPortfolio
      );

      console.log('\n🎉 Daily Execution Complete!');
      console.log(`📊 Summary: ${tradesExecuted} trades executed`);
      console.log(`💼 Portfolio Value: $${updatedPortfolio.total_value.toLocaleString()}`);

      return {
        success: true,
        tradesExecuted,
        totalValue: updatedPortfolio.total_value,
        summary
      };

    } catch (error) {
      console.error('❌ Daily execution failed:', error);
      return {
        success: false,
        tradesExecuted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: 'Execution failed due to error'
      };
    }
  }

  private async validateTrade(trade: Trade, portfolio: Portfolio): Promise<boolean> {
    try {
      if (trade.action === 'BUY') {
        // Check if we have enough cash
        if (trade.total_value > portfolio.cash_available) {
          console.warn(`⚠️ Insufficient cash for ${trade.symbol}: need $${trade.total_value}, have $${portfolio.cash_available}`);
          return false;
        }

        // Check position sizing (max 20% of portfolio in single position)
        const maxPositionValue = portfolio.total_value * 0.2;
        if (trade.total_value > maxPositionValue) {
          console.warn(`⚠️ Position too large for ${trade.symbol}: $${trade.total_value} > $${maxPositionValue} (20% limit)`);
          return false;
        }
      } else { // SELL
        // Check if we have enough shares to sell
        const currentPosition = portfolio.positions[trade.symbol];
        if (!currentPosition || currentPosition.quantity < trade.quantity) {
          console.warn(`⚠️ Insufficient shares to sell ${trade.symbol}: need ${trade.quantity}, have ${currentPosition?.quantity || 0}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Error validating trade:`, error);
      return false;
    }
  }

  private async executeTrade(trade: Trade): Promise<void> {
    try {
      // Save trade to database
      await this.supabaseService.saveTrade(trade);

      // Update portfolio
      await this.supabaseService.updatePortfolio(
        trade.agent_id,
        trade.symbol,
        trade.action,
        trade.quantity,
        trade.price
      );

      // Update agent cash
      const cashChange = trade.action === 'BUY' 
        ? -trade.total_value 
        : trade.total_value;
      
      await this.supabaseService.updateAgentCash(trade.agent_id, cashChange);

    } catch (error) {
      console.error(`❌ Error executing trade:`, error);
      throw error;
    }
  }

  private async generateFallbackTrades(
    earningsAnalyses: EarningsAnalysis[],
    portfolio: Portfolio
  ): Promise<TradingDecision[]> {
    const fallbackTrades: TradingDecision[] = [];

    try {
      // Find the most promising earnings opportunity
      if (earningsAnalyses.length > 0) {
        const bestOpportunity = earningsAnalyses.reduce((best, current) => 
          current.sentiment.newsScore > best.sentiment.newsScore ? current : best
        );

        fallbackTrades.push({
          symbol: bestOpportunity.symbol,
          action: 'BUY',
          quantity: Math.max(1, Math.floor((portfolio.cash_available * 0.1) / 150)), // Conservative 10% allocation
          reasoning: `Fallback trade: ${bestOpportunity.symbol} shows promising earnings momentum with news sentiment of ${bestOpportunity.sentiment.newsScore.toFixed(1)}/10`,
          confidence: 0.4,
          expectedReturn: 5,
          riskLevel: 'low'
        });
      }

      // If we have positions, consider taking profits on one
      const positions = Object.keys(portfolio.positions);
      if (positions.length > 0) {
        const symbolToSell = positions[0];
        const position = portfolio.positions[symbolToSell];
        
        fallbackTrades.push({
          symbol: symbolToSell,
          action: 'SELL',
          quantity: Math.min(position.quantity, Math.ceil(position.quantity * 0.3)), // Sell 30% of position
          reasoning: `Fallback trade: Taking partial profits on ${symbolToSell} position`,
          confidence: 0.3,
          expectedReturn: 3,
          riskLevel: 'low'
        });
      }

    } catch (error) {
      console.error('❌ Error generating fallback trades:', error);
    }

    return fallbackTrades.slice(0, 2); // Max 2 fallback trades
  }

  private determineAnalystRating(sentiment: number): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
    if (sentiment > 0.6) return 'strong_buy';
    if (sentiment > 0.2) return 'buy';
    if (sentiment > -0.2) return 'hold';
    if (sentiment > -0.6) return 'sell';
    return 'strong_sell';
  }

  private generateExecutionSummary(
    analyses: EarningsAnalysis[],
    trades: Trade[],
    portfolio: Portfolio
  ): string {
    const buyTrades = trades.filter(t => t.action === 'BUY');
    const sellTrades = trades.filter(t => t.action === 'SELL');
    const totalTradeValue = trades.reduce((sum, t) => sum + t.total_value, 0);

    return `Earnings Momentum Agent executed ${trades.length} trades based on analysis of ${analyses.length} upcoming earnings events. 
Bought ${buyTrades.length} positions (${buyTrades.map(t => t.symbol).join(', ')}), 
Sold ${sellTrades.length} positions (${sellTrades.map(t => t.symbol).join(', ')}). 
Total trade volume: $${totalTradeValue.toLocaleString()}. 
Portfolio value: $${portfolio.total_value.toLocaleString()}.`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}