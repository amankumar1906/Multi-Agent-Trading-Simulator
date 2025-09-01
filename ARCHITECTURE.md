# AI Investment Agent Competition Platform

## Project Vision

**What**: A competitive AI trading simulation where 5 different trading agents compete using distinct strategies, each starting with a virtual $100 portfolio.

**Why**: Compare the effectiveness of different AI-driven trading approaches in a controlled environment, demonstrating which strategies perform best over time.

**How**: Daily automated execution tracks performance using real market data (open/close prices) without actual trading, hosted on free-tier infrastructure.

## The 5 Trading Agents

### 1. **Social Sentiment Agent**
- **Strategy**: Analyzes Twitter/X sentiment for trending stocks
- **Signal**: High positive sentiment = Buy, High negative = Sell
- **Advantage**: Captures retail investor psychology and viral trends

### 2. **Earnings Momentum Agent** 
- **Strategy**: Trades around earnings announcements using historical patterns
- **Signal**: Beat estimates = Buy, Miss estimates = Sell
- **Advantage**: Predictable events with measurable market reactions

### 3. **News Impact Agent**
- **Strategy**: Analyzes financial news for company-specific events
- **Signal**: Positive catalysts = Buy, Negative news = Sell  
- **Advantage**: First-mover advantage on breaking news

### 4. **Price Trend Following Agent**
- **Strategy**: "Buy high, sell higher" - follows stocks hitting new highs
- **Signal**: Stock hits 30-day high = Buy, 10% loss = Sell, 30% gain = Sell
- **Advantage**: Simple momentum strategy anyone can understand

### 5. **"Buy the Dip" Agent** 
- **Strategy**: Bargain hunting during market crashes
- **Signal**: Market drops 5%+ + quality stock down 15%+ = Buy
- **Advantage**: Classic "buy low, sell high" approach with quality focus

## Technology Stack (Final Decisions)

| **Component** | **Technology** | **Why This Choice** |
|---------------|----------------|-------------------|
| **Database** | **Supabase (PostgreSQL)** | ACID compliance for financial data, complex queries for performance analysis, real-time subscriptions |
| **Backend** | **AWS Lambda + API Gateway** | Serverless cost efficiency, perfect for daily execution schedules |
| **Frontend** | **Next.js on Vercel** | Free hosting, excellent performance, built-in analytics |
| **AI Orchestration** | **LangGraph** | Production-ready agent state management, workflow control |
| **AI Provider** | **Google Gemini** | Best free tier: 1,500 requests/day, multimodal capabilities |
| **Market Data** | **Yahoo Finance API** | Free, reliable, comprehensive stock data |
| **Monitoring** | **Vercel Analytics + CloudWatch** | Built-in, free tier coverage |

## System Architecture

```
Daily Lambda Execution (9:30 AM ET)
          ↓
┌─────────────────────┐
│   5 AI Agents       │ ← Google Gemini API
│   (Parallel)        │ ← Market Data APIs  
└─────────────────────┘
          ↓
┌─────────────────────┐
│   Performance       │ ← Calculate P&L
│   Calculation       │ ← Update Rankings
└─────────────────────┘
          ↓  
┌─────────────────────┐
│   Supabase DB       │ ← Store results
│   (PostgreSQL)      │ ← Real-time updates
└─────────────────────┘
          ↓
┌─────────────────────┐
│   Dashboard         │ ← Live leaderboard
│   (Next.js)         │ ← Performance charts
└─────────────────────┘
```

## Database Schema

```sql
-- Agents performance tracking
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    strategy VARCHAR(50),
    current_value DECIMAL(10,2),
    total_return DECIMAL(5,4),
    win_rate DECIMAL(5,4),
    total_trades INTEGER
);

-- Daily portfolio snapshots  
CREATE TABLE daily_performance (
    agent_id UUID REFERENCES agents(id),
    date DATE,
    portfolio_value DECIMAL(10,2),
    daily_return DECIMAL(5,4),
    positions JSONB -- {symbol: shares, symbol: shares}
);

-- Trade decisions with reasoning
CREATE TABLE trades (
    agent_id UUID REFERENCES agents(id),
    date DATE,
    symbol VARCHAR(10),
    action VARCHAR(4), -- BUY/SELL
    quantity INTEGER,
    price DECIMAL(10,4),
    reasoning TEXT,
    confidence DECIMAL(3,2)
);
```

## Key Features

### 📊 **Real-Time Leaderboard**
Live rankings showing which agent is winning, updated daily after market close.

### 📈 **Performance Analytics** 
- Total return percentage
- Win/loss ratio
- Risk metrics (Sharpe ratio, max drawdown)
- Trade frequency and confidence scores

### 🧠 **AI Reasoning Transparency**
Each trade includes the agent's reasoning and confidence level for full transparency.

### ⚡ **Zero-Cost Operation**
Entire system runs on free tiers - Vercel, Supabase, AWS Lambda, Google Gemini.

## Implementation Timeline

**Week 1-2**: Database setup, agent framework, basic dashboard
**Week 3-4**: Implement all 5 agents with their unique strategies  
**Week 5-6**: AWS Lambda deployment, daily automation, testing
**Week 7**: Production deployment, monitoring, performance tuning

## Success Metrics

- **Performance**: Which agent generates the highest returns?
- **Consistency**: Which agent has the lowest volatility?
- **Activity**: Which agent makes the most confident trades?
- **Reasoning**: Which agent provides the best trade explanations?

## Risk Management

- **No Real Money**: Pure simulation using price movements
- **Position Limits**: Max 20% of portfolio in any single stock
- **Daily Execution**: No day trading, positions held overnight minimum
- **Error Handling**: Graceful failures with detailed logging

This platform will demonstrate the power of different AI trading approaches while providing valuable insights into which strategies work best in different market conditions.