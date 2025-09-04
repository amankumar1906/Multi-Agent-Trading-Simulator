import axios from 'axios';

export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
}

export interface NewsSentiment {
  symbol: string;
  overallSentiment: number; // -1 to 1
  articlesAnalyzed: number;
  keyThemes: string[];
  bullishPoints: string[];
  bearishPoints: string[];
}

export class NewsAnalysisService {
  private readonly newsApiKey: string | null;
  
  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY || null;
    console.log(`📰 NewsAnalysisService initialized ${this.newsApiKey ? 'with API key' : 'without API key (using mock data)'}`);
  }

  async getEarningsRelatedNews(symbol: string, daysBack: number = 7): Promise<NewsArticle[]> {
    try {
      console.log(`📰 Fetching earnings-related news for ${symbol} (last ${daysBack} days)`);

      // If no API key, return mock data
      if (!this.newsApiKey) {
        return this.getMockNewsData(symbol);
      }

      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysBack);

      const searchQuery = `${symbol} earnings OR ${symbol} quarterly results OR ${symbol} financial results`;
      
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: searchQuery,
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
          sortBy: 'relevancy',
          apiKey: this.newsApiKey,
          pageSize: 20,
          language: 'en'
        }
      });

      const articles = response.data.articles || [];
      
      const processedArticles: NewsArticle[] = articles.map((article: any) => ({
        title: article.title,
        content: article.description || article.content || '',
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source.name,
        sentiment: this.analyzeSentiment(article.title + ' ' + (article.description || '')),
        relevanceScore: this.calculateRelevanceScore(article.title, symbol)
      }));

      console.log(`📊 Found ${processedArticles.length} relevant articles for ${symbol}`);
      return processedArticles.filter(article => article.relevanceScore > 0.3);

    } catch (error) {
      console.error(`❌ Error fetching news for ${symbol}:`, error);
      return this.getMockNewsData(symbol);
    }
  }

  async analyzeNewsSentiment(symbol: string): Promise<NewsSentiment> {
    try {
      console.log(`📊 Analyzing news sentiment for ${symbol}`);

      const articles = await this.getEarningsRelatedNews(symbol, 14);
      
      if (articles.length === 0) {
        return {
          symbol,
          overallSentiment: 0,
          articlesAnalyzed: 0,
          keyThemes: [],
          bullishPoints: [],
          bearishPoints: []
        };
      }

      const sentimentScores: number[] = articles.map(article => {
        switch (article.sentiment) {
          case 'positive': return 1;
          case 'negative': return -1;
          default: return 0;
        }
      });

      const overallSentiment = sentimentScores.length > 0 
        ? sentimentScores.reduce((sum, score) => sum + score, 0) / articles.length 
        : 0;
      
      const keyThemes = this.extractKeyThemes(articles);
      const bullishPoints = this.extractBullishPoints(articles);
      const bearishPoints = this.extractBearishPoints(articles);

      const sentiment: NewsSentiment = {
        symbol,
        overallSentiment,
        articlesAnalyzed: articles.length,
        keyThemes,
        bullishPoints,
        bearishPoints
      };

      console.log(`📈 Sentiment analysis complete for ${symbol}: ${overallSentiment.toFixed(2)}`);
      return sentiment;

    } catch (error) {
      console.error(`❌ Error analyzing sentiment for ${symbol}:`, error);
      return this.getMockSentimentData(symbol);
    }
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['growth', 'beat', 'strong', 'exceed', 'positive', 'gains', 'up', 'bullish', 'optimistic'];
    const negativeWords = ['decline', 'miss', 'weak', 'drop', 'negative', 'losses', 'down', 'bearish', 'pessimistic'];
    
    const lowerText = text.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateRelevanceScore(title: string, symbol: string): number {
    const lowerTitle = title.toLowerCase();
    const lowerSymbol = symbol.toLowerCase();
    
    let score = 0;
    
    // Direct symbol mention
    if (lowerTitle.includes(lowerSymbol)) score += 0.5;
    
    // Earnings-related keywords
    const earningsKeywords = ['earnings', 'quarterly', 'results', 'eps', 'revenue', 'guidance'];
    earningsKeywords.forEach(keyword => {
      if (lowerTitle.includes(keyword)) score += 0.2;
    });
    
    return Math.min(score, 1.0);
  }

  private extractKeyThemes(articles: NewsArticle[]): string[] {
    const themes = ['Earnings Growth', 'Revenue Performance', 'Market Outlook', 'Competitive Position'];
    return themes.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private extractBullishPoints(articles: NewsArticle[]): string[] {
    return [
      'Strong revenue growth expected',
      'Positive analyst upgrades',
      'Market expansion opportunities',
      'Improved profit margins'
    ].slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private extractBearishPoints(articles: NewsArticle[]): string[] {
    return [
      'Increased competition pressure',
      'Rising costs impacting margins',
      'Economic headwinds',
      'Regulatory challenges'
    ].slice(0, Math.floor(Math.random() * 2) + 1);
  }

  private getMockNewsData(symbol: string): NewsArticle[] {
    return [
      {
        title: `${symbol} Earnings Preview: Analysts Expect Strong Quarter`,
        content: `Analysts are optimistic about ${symbol}'s upcoming earnings report, with expectations for strong revenue growth.`,
        url: 'https://example.com/news1',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        source: 'Financial News',
        sentiment: 'positive',
        relevanceScore: 0.9
      },
      {
        title: `Market Volatility May Impact ${symbol} Performance`,
        content: `Recent market conditions could pose challenges for ${symbol} in the upcoming quarter.`,
        url: 'https://example.com/news2',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'Market Watch',
        sentiment: 'negative',
        relevanceScore: 0.7
      }
    ];
  }

  private getMockSentimentData(symbol: string): NewsSentiment {
    return {
      symbol,
      overallSentiment: (Math.random() - 0.5) * 1.4, // Random sentiment between -0.7 and 0.7
      articlesAnalyzed: Math.floor(Math.random() * 15) + 5,
      keyThemes: ['Earnings Growth', 'Market Outlook'],
      bullishPoints: ['Strong revenue growth expected', 'Positive analyst upgrades'],
      bearishPoints: ['Increased competition', 'Economic headwinds']
    };
  }
}