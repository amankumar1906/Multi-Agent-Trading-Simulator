// Simple test script to verify our services work locally
require('dotenv').config({ path: '../.env' });

async function testServices() {
  console.log('🧪 Testing AI Investment Agent Services...\n');

  // Test 1: Environment Variables
  console.log('1. Testing Environment Variables...');
  const requiredVars = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars);
    return;
  }
  console.log('✅ All environment variables present\n');

  // Test 2: Yahoo Finance API
  console.log('2. Testing Yahoo Finance API...');
  try {
    const axios = require('axios');
    const response = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/AAPL', {
      params: { interval: '1d', range: '1d' },
      timeout: 10000
    });
    const price = response.data.chart.result[0].meta.regularMarketPrice;
    console.log(`✅ Yahoo Finance works - AAPL: $${price}\n`);
  } catch (error) {
    console.log('❌ Yahoo Finance failed:', error.message, '\n');
  }

  // Test 3: Reddit API
  console.log('3. Testing Reddit API...');
  try {
    const axios = require('axios');
    const response = await axios.get('https://www.reddit.com/r/stocks/hot.json?limit=5', {
      headers: { 'User-Agent': 'AITradingBot/1.0' },
      timeout: 10000
    });
    const posts = response.data.data.children.length;
    console.log(`✅ Reddit API works - Found ${posts} posts\n`);
  } catch (error) {
    console.log('❌ Reddit failed:', error.message, '\n');
  }

  // Test 4: StockTwits API  
  console.log('4. Testing StockTwits API...');
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.stocktwits.com/api/2/streams/symbol/AAPL.json', {
      params: { limit: 5 },
      timeout: 10000
    });
    const messages = response.data.messages?.length || 0;
    console.log(`✅ StockTwits works - Found ${messages} messages\n`);
  } catch (error) {
    console.log('❌ StockTwits failed:', error.message, '\n');
  }

  // Test 5: Google Gemini API
  console.log('5. Testing Google Gemini AI...');
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Say "Hello from Gemini!" if you can see this.');
    const response = result.response.text();
    console.log(`✅ Gemini AI works - Response: ${response.substring(0, 50)}...\n`);
  } catch (error) {
    console.log('❌ Gemini AI failed:', error.message, '\n');
  }

  // Test 6: Supabase Connection
  console.log('6. Testing Supabase Database...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Test query - check if tables exist
    const { data, error } = await supabase.from('agents').select('id').limit(1);
    
    if (error) {
      console.log('❌ Supabase query failed:', error.message);
      console.log('💡 Make sure you ran the database schema in Supabase SQL Editor\n');
    } else {
      console.log('✅ Supabase connection works\n');
    }
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message, '\n');
  }

  console.log('🎉 Service testing complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. If any tests failed, check your API keys and network connection');
  console.log('2. Make sure you ran the database schema in Supabase SQL Editor');
  console.log('3. If all tests pass, we can deploy to AWS Lambda!');
}

// Run the tests
testServices().catch(console.error);