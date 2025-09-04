import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { EarningsMomentumAgent } from './agents/EarningsMomentumAgent';

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
  console.log('🤖 Starting Earnings Momentum AI Agent execution at 2:00 PM ET');
  console.log('Event:', JSON.stringify(event, null, 2));

  const results = {
    executionId: context.awsRequestId,
    timestamp: new Date().toISOString(),
    agent: {
      name: 'Earnings Momentum AI Agent',
      strategy: 'earnings-momentum'
    }
  };

  try {
    // Execute Earnings Momentum Agent
    console.log('Executing Earnings Momentum Agent...');
    const earningsAgent = new EarningsMomentumAgent();
    const earningsResult = await earningsAgent.executeDaily();
    
    const response = {
      ...results,
      agent: {
        ...results.agent,
        ...earningsResult
      }
    };

    console.log('✅ Daily execution completed successfully');
    console.log(`Results: ${JSON.stringify(response, null, 2)}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Earnings Momentum Agent execution completed successfully',
        results: response
      })
    };

  } catch (error) {
    console.error('❌ Daily execution failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Earnings Momentum Agent execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        results: {
          ...results,
          agent: {
            ...results.agent,
            success: false,
            tradesExecuted: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
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
          service: 'Earnings Momentum AI Agent API',
          agent: 'earnings-momentum-agent'
        })
      };
    }

    // Manual trigger for earnings agent (for testing)
    if (path === '/trigger/earnings' && method === 'POST') {
      console.log('Manual trigger requested for earnings momentum agent');
      
      const earningsAgent = new EarningsMomentumAgent();
      const result = await earningsAgent.executeDaily();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Earnings Momentum Agent executed successfully',
          result
        })
      };
    }

    // Test services endpoint
    if (path === '/test/services' && method === 'GET') {
      const testResults = {
        timestamp: new Date().toISOString(),
        agent: 'earnings-momentum-agent',
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

      // Test Earnings Data Service
      try {
        const { EarningsDataService } = await import('./services/EarningsDataService');
        const earnings = new EarningsDataService();
        const upcomingEarnings = await earnings.getUpcomingEarnings(3);
        testResults.services.earningsData = { 
          status: 'ok',
          sampleData: `Found ${upcomingEarnings.length} upcoming earnings`
        };
      } catch (error) {
        testResults.services.earningsData = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Test News Analysis Service
      try {
        const { NewsAnalysisService } = await import('./services/NewsAnalysisService');
        const news = new NewsAnalysisService();
        const sentiment = await news.analyzeNewsSentiment('AAPL');
        testResults.services.newsAnalysis = { 
          status: 'ok',
          sampleData: `AAPL sentiment: ${sentiment.overallSentiment.toFixed(2)}`
        };
      } catch (error) {
        testResults.services.newsAnalysis = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
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
        agent: 'earnings-momentum-agent',
        availableEndpoints: [
          'GET /health',
          'POST /trigger/earnings',
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
        agent: 'earnings-momentum-agent',
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
  console.log('✅ Environment variables validated for Earnings Momentum Agent');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
}