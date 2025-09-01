import axios from 'axios';
import { RedditPost } from '../types';

export class RedditService {
  private readonly baseUrl = 'https://www.reddit.com';
  private readonly userAgent = 'AITradingBot/1.0';

  constructor() {}

  async getStockMentions(targetSymbols: string[], limit: number = 50): Promise<RedditPost[]> {
    const subreddits = ['stocks', 'investing', 'SecurityAnalysis', 'ValueInvesting', 'wallstreetbets'];
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits) {
      try {
        const posts = await this.scrapeSubreddit(subreddit, targetSymbols, Math.floor(limit / subreddits.length));
        allPosts.push(...posts);
        console.log(`Found ${posts.length} relevant posts in r/${subreddit}`);
      } catch (error) {
        console.warn(`Failed to scrape r/${subreddit}:`, error);
      }
    }

    const filtered = allPosts.filter(post => post.symbols.length > 0);
    console.log(`Total posts with symbols: ${filtered.length}`);
    
    return filtered
      .sort((a, b) => b.score - a.score) // Sort by upvotes
      .slice(0, limit);
  }

  private async scrapeSubreddit(subreddit: string, targetSymbols: string[], limit: number): Promise<RedditPost[]> {
    try {
      // Use Reddit's JSON API (no authentication required for public posts)
      const response = await axios.get(`${this.baseUrl}/r/${subreddit}/hot.json?limit=${limit}`, {
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      const posts = response.data.data.children;
      const processedPosts: RedditPost[] = [];

      for (const postData of posts) {
        const post = postData.data;
        
        // Skip if removed or deleted
        if (post.selftext === '[removed]' || post.selftext === '[deleted]') {
          continue;
        }

        const foundSymbols = this.extractStockSymbols(post.title + ' ' + post.selftext, targetSymbols);
        
        if (foundSymbols.length > 0) {
          processedPosts.push({
            id: post.id,
            title: post.title,
            content: post.selftext || '',
            score: post.score,
            comments: post.num_comments,
            subreddit: subreddit,
            created: post.created_utc,
            symbols: foundSymbols
          });
        }
      }

      console.log(`Scraped ${processedPosts.length} posts from r/${subreddit}`);
      return processedPosts;

    } catch (error) {
      console.error(`Error scraping r/${subreddit}:`, error);
      return [];
    }
  }

  private extractStockSymbols(text: string, targetSymbols: string[]): string[] {
    const foundSymbols: string[] = [];
    const upperText = text.toUpperCase();

    for (const symbol of targetSymbols) {
      // More flexible pattern matching
      const patterns = [
        new RegExp(`\\$${symbol}\\b`, 'i'), // $AAPL
        new RegExp(`\\b${symbol}\\b`, 'i'), // AAPL as standalone word
        new RegExp(`\\b${symbol}\\s+(stock|shares?|calls?|puts?)`, 'i'), // AAPL stock/shares
        new RegExp(`(ticker:?|symbol:?)\\s*${symbol}\\b`, 'i'), // ticker: AAPL
        new RegExp(`\\b${symbol}\\/`, 'i') // AAPL/
      ];

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          if (!foundSymbols.includes(symbol)) {
            foundSymbols.push(symbol);
            console.log(`Found ${symbol} in: "${text.substring(0, 100)}..."`);
          }
          break;
        }
      }
    }

    return foundSymbols;
  }

  async getPopularStocks(): Promise<string[]> {
    // Get most mentioned stocks across investing subreddits
    const subreddits = ['stocks', 'investing', 'SecurityAnalysis'];
    const symbolCounts: Record<string, number> = {};

    for (const subreddit of subreddits) {
      try {
        const response = await axios.get(`${this.baseUrl}/r/${subreddit}/hot.json?limit=100`, {
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000
        });

        const posts = response.data.data.children;
        
        for (const postData of posts) {
          const post = postData.data;
          const text = post.title + ' ' + post.selftext;
          const symbols = this.extractCommonStockSymbols(text);
          
          for (const symbol of symbols) {
            symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
          }
        }
      } catch (error) {
        console.warn(`Failed to get popular stocks from r/${subreddit}:`, error);
      }
    }

    // Return top 20 most mentioned stocks
    return Object.entries(symbolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([symbol]) => symbol);
  }

  private extractCommonStockSymbols(text: string): string[] {
    // Common stock symbols to look for
    const commonStocks = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 
      'NFLX', 'AMD', 'INTC', 'BABA', 'V', 'MA', 'JPM', 'BAC', 'WMT',
      'DIS', 'PYPL', 'ADBE', 'CRM', 'ORCL', 'IBM', 'UBER', 'LYFT'
    ];
    
    return this.extractStockSymbols(text, commonStocks);
  }

  // Rate limiting helper
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}