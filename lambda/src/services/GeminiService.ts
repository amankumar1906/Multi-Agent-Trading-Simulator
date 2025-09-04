import { GoogleGenerativeAI } from '@google/generative-ai';
import { RedditPost, StocktwitsPost } from '../types';

export interface SentimentAnalysis {
  symbol: string;
  sentimentScore: number; // 0-1 (0 = very negative, 1 = very positive)
  confidence: number; // 0-1
  reasoning: string;
  postCount: number;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeSentiment(
    redditPosts: RedditPost[], 
    stocktwitsPosts: StocktwitsPost[]
  ): Promise<SentimentAnalysis[]> {
    const symbolData: Record<string, {
      reddit: RedditPost[];
      stocktwits: StocktwitsPost[];
    }> = {};

    // Group posts by symbol
    for (const post of redditPosts) {
      for (const symbol of post.symbols) {
        if (!symbolData[symbol]) {
          symbolData[symbol] = { reddit: [], stocktwits: [] };
        }
        symbolData[symbol].reddit.push(post);
      }
    }

    for (const post of stocktwitsPosts) {
      if (!symbolData[post.symbol]) {
        symbolData[post.symbol] = { reddit: [], stocktwits: [] };
      }
      symbolData[post.symbol].stocktwits.push(post);
    }

    const results: SentimentAnalysis[] = [];

    for (const [symbol, data] of Object.entries(symbolData)) {
      try {
        const analysis = await this.analyzeSymbolSentiment(symbol, data.reddit, data.stocktwits);
        results.push(analysis);
      } catch (error) {
        console.error(`Error analyzing sentiment for ${symbol}:`, error);
        // Fallback to neutral sentiment
        results.push({
          symbol,
          sentimentScore: 0.5,
          confidence: 0.1,
          reasoning: 'Analysis failed, defaulting to neutral',
          postCount: data.reddit.length + data.stocktwits.length
        });
      }
    }

    return results;
  }

  private async analyzeSymbolSentiment(
    symbol: string,
    redditPosts: RedditPost[],
    stocktwitsPosts: StocktwitsPost[]
  ): Promise<SentimentAnalysis> {
    
    // Prepare content for analysis
    const contentSample = this.prepareContentSample(symbol, redditPosts, stocktwitsPosts);
    
    if (contentSample.trim().length === 0) {
      return {
        symbol,
        sentimentScore: 0.5,
        confidence: 0.1,
        reasoning: 'No content to analyze',
        postCount: 0
      };
    }

    const prompt = this.buildSentimentPrompt(symbol, contentSample, redditPosts.length + stocktwitsPosts.length);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return this.parseSentimentResponse(symbol, response, redditPosts.length + stocktwitsPosts.length);
      
    } catch (error) {
      console.error(`Gemini API error for ${symbol}:`, error);
      throw error;
    }
  }

  private prepareContentSample(symbol: string, redditPosts: RedditPost[], stocktwitsPosts: StocktwitsPost[]): string {
    let content = `Analyzing sentiment for ${symbol}:\n\n`;

    // Add Reddit posts (limit to avoid token limits)
    const topRedditPosts = redditPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (topRedditPosts.length > 0) {
      content += "REDDIT POSTS:\n";
      for (const post of topRedditPosts) {
        content += `- Title: ${post.title}\n`;
        if (post.content && post.content.length > 0 && post.content.length < 200) {
          content += `  Content: ${post.content}\n`;
        }
        content += `  Score: ${post.score}, Comments: ${post.comments}\n\n`;
      }
    }

    // Add StockTwits posts (limit to recent ones)
    const recentStockTwits = stocktwitsPosts
      .sort((a, b) => b.created - a.created)
      .slice(0, 10);

    if (recentStockTwits.length > 0) {
      content += "STOCKTWITS POSTS:\n";
      for (const post of recentStockTwits) {
        content += `- ${post.content}\n`;
        content += `  Sentiment: ${post.sentiment}\n\n`;
      }
    }

    // Truncate if too long (stay within token limits)
    if (content.length > 3000) {
      content = content.substring(0, 3000) + "...[truncated]";
    }

    return content;
  }

  private buildSentimentPrompt(symbol: string, content: string, totalPosts: number): string {
    return `You are a financial sentiment analysis expert. Analyze the following social media content about ${symbol} and provide a sentiment score.

${content}

Based on this content (${totalPosts} total posts), provide your analysis in this EXACT format:

SENTIMENT_SCORE: [number between 0.0 and 1.0]
CONFIDENCE: [number between 0.0 and 1.0]
REASONING: [brief explanation of why you chose this score]

Guidelines:
- 0.0-0.3: Very negative (strong sell signals, major concerns)
- 0.3-0.4: Negative (some concerns, mild bearishness)
- 0.4-0.6: Neutral (mixed or unclear signals)
- 0.6-0.7: Positive (generally optimistic, some bullish signals)
- 0.7-1.0: Very positive (strong buy signals, major excitement)

Consider:
- Overall tone and sentiment of posts
- Number of upvotes/engagement on Reddit
- Bullish vs bearish sentiment on StockTwits
- Quality and specificity of content
- Recent vs older sentiment

Be conservative - only give extreme scores (below 0.3 or above 0.7) if sentiment is very clear and strong.`;
  }

  private parseSentimentResponse(symbol: string, response: string, postCount: number): SentimentAnalysis {
    try {
      const sentimentMatch = response.match(/SENTIMENT_SCORE:\s*([0-9.]+)/i);
      const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9.]+)/i);
      const reasoningMatch = response.match(/REASONING:\s*(.+?)(?=\n|$)/is);

      const sentimentScore = sentimentMatch ? 
        Math.max(0, Math.min(1, parseFloat(sentimentMatch[1]))) : 0.5;
      
      const confidence = confidenceMatch ? 
        Math.max(0, Math.min(1, parseFloat(confidenceMatch[1]))) : 0.5;
      
      const reasoning = reasoningMatch ? 
        reasoningMatch[1].trim() : 'Analysis completed';

      return {
        symbol,
        sentimentScore,
        confidence,
        reasoning,
        postCount
      };

    } catch (error) {
      console.error(`Error parsing sentiment response for ${symbol}:`, error);
      return {
        symbol,
        sentimentScore: 0.5,
        confidence: 0.1,
        reasoning: 'Failed to parse analysis',
        postCount
      };
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      console.log(`Gemini prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`Gemini response: ${text}`);
      return text;
    } catch (error) {
      console.error('Gemini text generation failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent("Hello, respond with 'OK' if you can see this.");
      const response = result.response.text();
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}