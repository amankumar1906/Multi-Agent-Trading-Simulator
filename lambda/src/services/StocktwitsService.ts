import axios from 'axios';
import { StocktwitsPost } from '../types';

export class StocktwitsService {
  private readonly baseUrl = 'https://api.stocktwits.com/api/2';
  private readonly requestDelay = 500; // 500ms between requests to be respectful

  constructor() {}

  async getSymbolStream(symbol: string, limit: number = 30): Promise<StocktwitsPost[]> {
    try {
      await this.delay(this.requestDelay); // Rate limiting

      const response = await axios.get(`${this.baseUrl}/streams/symbol/${symbol}.json`, {
        params: {
          limit: Math.min(limit, 30) // API max is 30
        },
        timeout: 10000
      });

      if (response.data && response.data.messages) {
        return response.data.messages.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.body,
          sentiment: msg.entities?.sentiment?.basic || 'neutral',
          symbol: symbol,
          created: new Date(msg.created_at).getTime() / 1000
        }));
      }

      return [];

    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.warn(`Rate limited for ${symbol}, retrying after delay...`);
        await this.delay(2000);
        return this.getSymbolStream(symbol, limit);
      }
      
      console.error(`Error fetching StockTwits data for ${symbol}:`, error);
      return [];
    }
  }

  async getMultipleSymbols(symbols: string[], postsPerSymbol: number = 20): Promise<StocktwitsPost[]> {
    const allPosts: StocktwitsPost[] = [];

    for (const symbol of symbols) {
      try {
        const posts = await this.getSymbolStream(symbol, postsPerSymbol);
        allPosts.push(...posts);
        
        // Add delay between symbols to respect rate limits
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await this.delay(this.requestDelay);
        }
      } catch (error) {
        console.warn(`Failed to fetch StockTwits data for ${symbol}:`, error);
      }
    }

    return allPosts
      .filter(post => post.content && post.content.length > 10) // Filter out very short posts
      .sort((a, b) => b.created - a.created); // Sort by recency
  }

  async getTrendingSymbols(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/trending/symbols.json`, {
        timeout: 10000
      });

      if (response.data && response.data.symbols) {
        return response.data.symbols.map((s: any) => s.symbol).slice(0, 20);
      }

      return [];

    } catch (error) {
      console.error('Error fetching trending symbols:', error);
      return [];
    }
  }

  // Convert StockTwits sentiment to numeric score
  convertSentimentToScore(sentiment: string): number {
    switch (sentiment.toLowerCase()) {
      case 'bullish':
        return 0.8;
      case 'bearish':
        return 0.2;
      case 'neutral':
      default:
        return 0.5;
    }
  }

  // Aggregate sentiment scores for a symbol
  aggregateSentiment(posts: StocktwitsPost[]): {
    averageScore: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    totalPosts: number;
  } {
    if (posts.length === 0) {
      return {
        averageScore: 0.5,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        totalPosts: 0
      };
    }

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let totalScore = 0;

    for (const post of posts) {
      const score = this.convertSentimentToScore(post.sentiment);
      totalScore += score;

      if (post.sentiment.toLowerCase() === 'bullish') {
        bullishCount++;
      } else if (post.sentiment.toLowerCase() === 'bearish') {
        bearishCount++;
      } else {
        neutralCount++;
      }
    }

    return {
      averageScore: totalScore / posts.length,
      bullishCount,
      bearishCount,
      neutralCount,
      totalPosts: posts.length
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}