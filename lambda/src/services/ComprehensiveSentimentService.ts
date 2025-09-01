import { YahooFinanceService } from './YahooFinanceService';
import { RedditService } from './RedditService';
import { StocktwitsService } from './StocktwitsService';
import { GeminiService } from './GeminiService';

interface SentimentSource {
  source: string;
  sentiment: number;
  confidence: number;
  dataPoints: number;
}

interface ComprehensiveSentiment {
  symbol: string;
  finalSentiment: number;
  confidence: number;
  sources: SentimentSource[];
  reasoning: string;
}

export class ComprehensiveSentimentService {
  private yahooFinance: YahooFinanceService;
  private reddit: RedditService;
  private stocktwits: StocktwitsService;
  private gemini: GeminiService;

  constructor() {
    this.yahooFinance = new YahooFinanceService();
    this.reddit = new RedditService();
    this.stocktwits = new StocktwitsService();
    this.gemini = new GeminiService();
  }

  /**
   * Get comprehensive sentiment for all symbols using multiple free sources
   */
  async getComprehensiveSentiment(symbols: string[]): Promise<ComprehensiveSentiment[]> {
    const results: ComprehensiveSentiment[] = [];

    for (const symbol of symbols) {
      try {
        console.log(`🔍 Analyzing comprehensive sentiment for ${symbol}...`);
        
        const sentimentSources = await Promise.allSettled([
          this.getSocialMediaSentiment(symbol),
          this.getNewsSentiment(symbol),
          this.getTechnicalSentiment(symbol),
          this.getVolumeSentiment(symbol)
        ]);

        const validSources: SentimentSource[] = [];
        
        sentimentSources.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            validSources.push(result.value);
          }
        });

        // Ensure we always have at least one sentiment source
        if (validSources.length === 0) {
          validSources.push(await this.getNeutralFallback(symbol));
        }

        const comprehensive = this.aggregateSentiments(symbol, validSources);
        results.push(comprehensive);

        console.log(`✅ ${symbol}: ${comprehensive.finalSentiment.toFixed(3)} (${comprehensive.sources.length} sources)`);
        
      } catch (error) {
        console.error(`❌ Error analyzing ${symbol}:`, error);
        // Add neutral fallback
        results.push({
          symbol,
          finalSentiment: 0.5,
          confidence: 0.2,
          sources: [await this.getNeutralFallback(symbol)],
          reasoning: `Error occurred, using neutral sentiment`
        });
      }
    }

    return results;
  }

  /**
   * Get sentiment from social media (Reddit + StockTwits)
   */
  private async getSocialMediaSentiment(symbol: string): Promise<SentimentSource> {
    try {
      // Get recent posts from both sources
      const [redditPosts, stocktwitsPosts] = await Promise.all([
        this.reddit.getStockMentions([symbol], 10).catch(() => []),
        this.stocktwits.getMultipleSymbols([symbol], 10).catch(() => [])
      ]);

      const totalPosts = redditPosts.length + stocktwitsPosts.length;
      
      if (totalPosts === 0) {
        throw new Error('No social media data');
      }

      // Use Gemini to analyze the posts
      const analysis = await this.gemini.analyzeSentiment(redditPosts, stocktwitsPosts);
      const symbolAnalysis = analysis.find(a => a.symbol === symbol);

      if (!symbolAnalysis) {
        throw new Error('No sentiment analysis returned');
      }

      return {
        source: 'social_media',
        sentiment: symbolAnalysis.sentimentScore,
        confidence: Math.min(totalPosts / 20, 1.0), // Higher confidence with more posts
        dataPoints: totalPosts
      };

    } catch (error) {
      throw new Error(`Social media sentiment failed: ${error}`);
    }
  }

  /**
   * Get sentiment from news headlines (FREE)
   */
  private async getNewsSentiment(symbol: string): Promise<SentimentSource> {
    try {
      // Use multiple free news sources
      const headlines = await Promise.all([
        this.getYahooFinanceNews(symbol),
        this.getFinvizNews(symbol),
        this.getGoogleNews(symbol)
      ]).then(results => results.flat().slice(0, 20)); // Max 20 headlines

      if (headlines.length === 0) {
        throw new Error('No news headlines found');
      }

      // Analyze headlines with Gemini using existing method structure
      const dummyPosts: any[] = headlines.map(headline => ({ title: headline, content: headline }));
      
      // Use the existing analyzeSentiment method
      const analysis = await this.gemini.analyzeSentiment(dummyPosts, []);
      const sentiment = analysis.length > 0 ? analysis[0].sentimentScore : 0.5;

      return {
        source: 'news',
        sentiment: sentiment,
        confidence: Math.min(headlines.length / 15, 1.0),
        dataPoints: headlines.length
      };

    } catch (error) {
      throw new Error(`News sentiment failed: ${error}`);
    }
  }

  /**
   * Get technical sentiment from price action (FREE)
   */
  private async getTechnicalSentiment(symbol: string): Promise<SentimentSource> {
    try {
      // Get recent price data
      const pricesData = await this.yahooFinance.getHistoricalPrices(symbol, 30);
      
      if (!pricesData || pricesData.length < 10) {
        throw new Error('Insufficient price data');
      }

      // Convert to the expected format
      const prices = pricesData.map(p => ({ close: p.price, volume: 1000000 })).reverse(); // Most recent first

      // Calculate technical indicators
      const currentPrice = prices[0].close;
      const sma5 = this.calculateSMA(prices.slice(0, 5));
      const sma20 = this.calculateSMA(prices.slice(0, 20));
      const rsi = this.calculateRSI(prices.slice(0, 14));
      
      // Calculate returns
      const return1d = (currentPrice - prices[1].close) / prices[1].close;
      const return5d = prices.length >= 5 ? (currentPrice - prices[4].close) / prices[4].close : 0;
      
      // Technical sentiment scoring
      let technicalScore = 0.5; // Start neutral

      // Price vs moving averages (40% weight)
      if (currentPrice > sma5) technicalScore += 0.1;
      if (currentPrice > sma20) technicalScore += 0.15;
      if (sma5 > sma20) technicalScore += 0.15;

      // Recent returns (30% weight)
      technicalScore += Math.max(-0.15, Math.min(0.15, return1d * 5)); // 1-day return
      technicalScore += Math.max(-0.15, Math.min(0.15, return5d * 3)); // 5-day return

      // RSI (30% weight)
      if (rsi < 30) technicalScore += 0.1; // Oversold = potential upside
      else if (rsi > 70) technicalScore -= 0.1; // Overbought = potential downside

      // Clamp between 0 and 1
      technicalScore = Math.max(0, Math.min(1, technicalScore));

      return {
        source: 'technical',
        sentiment: technicalScore,
        confidence: 0.7, // Technical analysis is quite reliable
        dataPoints: prices.length
      };

    } catch (error) {
      throw new Error(`Technical sentiment failed: ${error}`);
    }
  }

  /**
   * Get volume-based sentiment (FREE)
   */
  private async getVolumeSentiment(symbol: string): Promise<SentimentSource> {
    try {
      const pricesData = await this.yahooFinance.getHistoricalPrices(symbol, 10);
      
      if (!pricesData || pricesData.length < 5) {
        throw new Error('Insufficient volume data');
      }

      // For volume sentiment, we'll use price volatility as a proxy since volume data isn't easily available
      const prices = pricesData.map(p => p.price);
      
      // Calculate recent price change
      const priceChange = (prices[0] - prices[1]) / prices[1];
      
      // Calculate price volatility (proxy for volume sentiment)
      const returns = [];
      for (let i = 1; i < Math.min(prices.length, 5); i++) {
        returns.push((prices[i-1] - prices[i]) / prices[i]);
      }
      
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);

      // Volume sentiment logic using volatility as proxy
      let volumeSentiment = 0.5;
      
      if (volatility > 0.03) { // High volatility (proxy for high volume)
        if (priceChange > 0) volumeSentiment = 0.7; // High volatility + up = bullish
        else volumeSentiment = 0.3; // High volatility + down = bearish
      } else if (volatility < 0.01) { // Low volatility (proxy for low volume)
        volumeSentiment = 0.5; // Low volatility = neutral
      }

      return {
        source: 'volume',
        sentiment: volumeSentiment,
        confidence: 0.5,
        dataPoints: prices.length
      };

    } catch (error) {
      throw new Error(`Volume sentiment failed: ${error}`);
    }
  }

  /**
   * Aggregate multiple sentiment sources with weighted average
   */
  private aggregateSentiments(symbol: string, sources: SentimentSource[]): ComprehensiveSentiment {
    // Weight by source reliability and confidence
    const weights = {
      social_media: 0.35,
      news: 0.35,
      technical: 0.20,
      volume: 0.10
    };

    let weightedSum = 0;
    let totalWeight = 0;
    const sourceDetails: string[] = [];

    for (const source of sources) {
      const weight = weights[source.source as keyof typeof weights] || 0.1;
      const adjustedWeight = weight * source.confidence;
      
      weightedSum += source.sentiment * adjustedWeight;
      totalWeight += adjustedWeight;
      
      sourceDetails.push(`${source.source}: ${source.sentiment.toFixed(3)} (${source.dataPoints} pts)`);
    }

    const finalSentiment = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    const confidence = Math.min(totalWeight, 1.0);

    return {
      symbol,
      finalSentiment,
      confidence,
      sources,
      reasoning: `Weighted average from ${sources.length} sources: ${sourceDetails.join(', ')}`
    };
  }

  /**
   * Fallback neutral sentiment when all sources fail
   */
  private async getNeutralFallback(symbol: string): Promise<SentimentSource> {
    return {
      source: 'fallback',
      sentiment: 0.5,
      confidence: 0.1,
      dataPoints: 0
    };
  }

  // Helper methods for technical analysis
  private calculateSMA(prices: any[]): number {
    const sum = prices.reduce((acc, p) => acc + p.close, 0);
    return sum / prices.length;
  }

  private calculateRSI(prices: any[]): number {
    if (prices.length < 2) return 50;
    
    let gains = 0, losses = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i-1].close - prices[i].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Free news source methods
  private async getYahooFinanceNews(symbol: string): Promise<string[]> {
    try {
      // Yahoo Finance has free news API
      const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-US&region=US&quotesCount=1&newsCount=5`);
      const data = await response.json() as any;
      
      return data.news?.map((item: any) => item.title).slice(0, 5) || [];
    } catch {
      return [];
    }
  }

  private async getFinvizNews(symbol: string): Promise<string[]> {
    // Finviz doesn't have a direct API, but we can implement other free sources
    return [];
  }

  private async getGoogleNews(symbol: string): Promise<string[]> {
    // Google News RSS is free - implement if needed
    return [];
  }
}