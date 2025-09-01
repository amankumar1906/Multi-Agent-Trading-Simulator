import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SimpleSentimentAgent } from './agents/SimpleSentimentAgent';

export interface LambdaResponse {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
  };
  body: string;
}

// Daily execution handler (called by CloudWatch Events)
export async function dailyExecution(event: any, context: Context): Promise<any> {
  console.log('🤖 Starting daily AI agent execution at 2:00 PM ET');
  console.log('Event:', JSON.stringify(event, null, 2));

  const results = {
    executionId: context.awsRequestId,
    timestamp: new Date().toISOString(),
    agents: [] as any[]
  };

  try {
    // Execute Sentiment Agent
    console.log('Executing Sentiment Agent...');
    const sentimentAgent = new SimpleSentimentAgent();
    const sentimentResult = await sentimentAgent.executeDaily();
    
    results.agents.push({
      name: 'Social Sentiment AI Agent',
      strategy: 'sentiment',
      ...sentimentResult
    });

    console.log('✅ Daily execution completed successfully');
    console.log(`Results: ${JSON.stringify(results, null, 2)}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily execution completed successfully',
        results
      })
    };

  } catch (error) {
    console.error('❌ Daily execution failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Daily execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        results
      })
    };
  }
}

// API handler for frontend requests
export async function apiHandler(event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    console.log(`API Request: ${method} ${path}`);

    // Health check endpoint
    if (path === '/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'AI Investment Agents API'
        })
      };
    }

    // Manual trigger for sentiment agent (for testing)
    if (path === '/trigger/sentiment' && method === 'POST') {
      console.log('Manual trigger requested for sentiment agent');
      
      const sentimentAgent = new SimpleSentimentAgent();
      const result = await sentimentAgent.executeDaily();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Sentiment agent executed successfully',
          result
        })
      };
    }

    // Test individual services
    if (path === '/test/services' && method === 'GET') {
      const testResults = {
        timestamp: new Date().toISOString(),
        services: {} as Record<string, any>
      };

      // Test Gemini connection
      try {
        const { GeminiService } = await import('./services/GeminiService');
        const gemini = new GeminiService();
        const geminiWorking = await gemini.testConnection();
        testResults.services.gemini = { status: geminiWorking ? 'ok' : 'failed' };
      } catch (error) {
        testResults.services.gemini = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Test Yahoo Finance
      try {
        const { YahooFinanceService } = await import('./services/YahooFinanceService');
        const yahoo = new YahooFinanceService();
        const price = await yahoo.getCurrentPrice('AAPL');
        testResults.services.yahooFinance = { 
          status: price ? 'ok' : 'failed',
          samplePrice: price ? `AAPL: $${price}` : 'No data'
        };
      } catch (error) {
        testResults.services.yahooFinance = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Test Reddit
      try {
        const { RedditService } = await import('./services/RedditService');
        const reddit = new RedditService();
        const posts = await reddit.getStockMentions(['AAPL'], 5);
        testResults.services.reddit = { 
          status: 'ok',
          sampleData: `Found ${posts.length} posts`
        };
      } catch (error) {
        testResults.services.reddit = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Test StockTwits
      try {
        const { StocktwitsService } = await import('./services/StocktwitsService');
        const stocktwits = new StocktwitsService();
        const posts = await stocktwits.getSymbolStream('AAPL', 5);
        testResults.services.stocktwits = { 
          status: 'ok',
          sampleData: `Found ${posts.length} posts`
        };
      } catch (error) {
        testResults.services.stocktwits = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(testResults)
      };
    }

    // Default 404 response
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        message: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'POST /trigger/sentiment',
          'GET /test/services'
        ]
      })
    };

  } catch (error) {
    console.error('API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

// Environment validation
function validateEnvironment(): void {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'GEMINI_API_KEY'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Initialize environment check
try {
  validateEnvironment();
  console.log('✅ Environment variables validated');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
}