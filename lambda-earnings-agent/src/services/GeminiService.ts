import { GoogleGenerativeAI } from '@google/generative-ai';
import { EarningsAnalysis, TradingDecision, Portfolio } from '../types';

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

  async makeEarningsTradingDecisions(
    earningsAnalyses: EarningsAnalysis[],
    portfolio: Portfolio,
    recentTrades: any[]
  ): Promise<TradingDecision[]> {
    try {
      console.log(`🤖 AI analyzing ${earningsAnalyses.length} earnings opportunities`);

      const prompt = this.buildEarningsTradingPrompt(earningsAnalyses, portfolio, recentTrades);

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      console.log(`🤖 AI Response received (${response.length} characters)`);
      
      return this.parseTradingDecisions(response);

    } catch (error) {
      console.error('❌ Error generating trading decisions:', error);
      throw error;
    }
  }

  private buildEarningsTradingPrompt(
    earningsAnalyses: EarningsAnalysis[],
    portfolio: Portfolio,
    recentTrades: any[]
  ): string {
    const cashAvailable = portfolio.cash_available;
    const totalPortfolioValue = portfolio.total_value;
    const currentPositions = Object.keys(portfolio.positions);
    
    const earningsDataSummary = earningsAnalyses.map(analysis => {
      const historical = analysis.historicalPerformance;
      const avgSurprise = historical.length > 0 
        ? historical.reduce((sum, h) => sum + h.surprise, 0) / historical.length
        : 0;
      const avgPriceImpact = historical.length > 0 
        ? historical.reduce((sum, h) => sum + Math.abs(h.priceChangePost), 0) / historical.length
        : 0;

      return `
${analysis.symbol} (${analysis.company}):
- Earnings Date: ${new Date(analysis.upcomingEarnings.date).toLocaleDateString()}
- Time: ${analysis.upcomingEarnings.time}
- Historical Avg Surprise: ${avgSurprise.toFixed(2)}%
- Avg Price Impact: ${avgPriceImpact.toFixed(2)}%
- News Sentiment Score: ${analysis.sentiment.newsScore.toFixed(2)}/10
- Analyst Rating: ${analysis.sentiment.analystRating}
- Price Targets: $${analysis.sentiment.priceTargets.low}-$${analysis.sentiment.priceTargets.high} (avg: $${analysis.sentiment.priceTargets.average})
- Technical: RSI ${analysis.technicalIndicators.rsi}, 7d change: ${analysis.technicalIndicators.priceChange7d.toFixed(2)}%
- Current Position: ${currentPositions.includes(analysis.symbol) ? 'YES' : 'NO'}`;
    }).join('\n');

    const recentTradesContext = recentTrades.length > 0 
      ? `Recent trades (last 10):
${recentTrades.slice(0, 10).map(trade => 
  `- ${trade.action} ${trade.quantity} ${trade.symbol} @ $${trade.price} (${trade.reason.substring(0, 50)}...)`
).join('\n')}`
      : 'No recent trades.';

    return `You are a professional AI earnings momentum trading agent. Your specialty is making strategic trades around earnings announcements based on historical patterns, sentiment analysis, and technical indicators.

PORTFOLIO STATUS:
- Cash Available: $${cashAvailable.toLocaleString()}
- Total Portfolio Value: $${totalPortfolioValue.toLocaleString()}
- Current Positions: ${currentPositions.length > 0 ? currentPositions.join(', ') : 'None'}

EARNINGS OPPORTUNITIES:
${earningsDataSummary}

${recentTradesContext}

TRADING GUIDELINES:
- You MUST make at least 2 trades today (buy or sell - your choice)
- Focus on earnings momentum opportunities - companies with strong historical earnings surprise patterns
- Consider timing: pre-market vs after-market earnings
- Use position sizing based on confidence and risk
- You have complete autonomy over trade decisions and cash allocation
- Consider both growth and value opportunities around earnings

DECISION CRITERIA:
1. Historical earnings surprise patterns (companies that consistently beat/miss)
2. News sentiment and analyst ratings
3. Technical momentum (RSI, price trends)
4. Volatility expectations around earnings
5. Position sizing and risk management

Respond with your trading decisions in this EXACT format:

TRADE_1:
SYMBOL: [stock symbol]
ACTION: [BUY or SELL]
QUANTITY: [number of shares]
REASONING: [detailed explanation of why this trade makes sense]
CONFIDENCE: [0.1 to 1.0]
EXPECTED_RETURN: [percentage expected return]
RISK_LEVEL: [low, medium, high]

TRADE_2:
[same format]

[Continue for additional trades...]

Make strategic, well-reasoned decisions based on earnings momentum and historical patterns. Focus on companies with upcoming earnings that show strong historical performance or technical setups.`;
  }

  private parseTradingDecisions(response: string): TradingDecision[] {
    const decisions: TradingDecision[] = [];
    const tradeBlocks = response.split(/TRADE_\d+:/);

    for (const block of tradeBlocks) {
      if (!block.trim()) continue;

      try {
        const symbolMatch = block.match(/SYMBOL:\s*([A-Z]+)/i);
        const actionMatch = block.match(/ACTION:\s*(BUY|SELL)/i);
        const quantityMatch = block.match(/QUANTITY:\s*(\d+)/i);
        const reasoningMatch = block.match(/REASONING:\s*(.+?)(?=CONFIDENCE:|$)/is);
        const confidenceMatch = block.match(/CONFIDENCE:\s*([0-9.]+)/i);
        const expectedReturnMatch = block.match(/EXPECTED_RETURN:\s*([0-9.-]+)/i);
        const riskMatch = block.match(/RISK_LEVEL:\s*(low|medium|high)/i);

        if (symbolMatch && actionMatch && quantityMatch) {
          const decision: TradingDecision = {
            symbol: symbolMatch[1].toUpperCase(),
            action: actionMatch[1].toUpperCase() as 'BUY' | 'SELL',
            quantity: parseInt(quantityMatch[1]),
            reasoning: reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided',
            confidence: confidenceMatch ? Math.max(0.1, Math.min(1.0, parseFloat(confidenceMatch[1]))) : 0.5,
            expectedReturn: expectedReturnMatch ? parseFloat(expectedReturnMatch[1]) : 0,
            riskLevel: (riskMatch ? riskMatch[1].toLowerCase() : 'medium') as 'low' | 'medium' | 'high'
          };

          decisions.push(decision);
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse trade block:', error);
      }
    }

    console.log(`📊 Parsed ${decisions.length} trading decisions from AI response`);
    return decisions;
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