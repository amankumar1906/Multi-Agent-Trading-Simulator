import axios from 'axios';
import { EarningsEvent, IPOEvent, HistoricalEarningsData } from '../types';

export class EarningsDataService {
  private readonly finnhubKey: string;
  private readonly baseUrl = 'https://finnhub.io/api/v1';
  
  constructor() {
    this.finnhubKey = process.env.FINNHUB_API_KEY!;
    if (!this.finnhubKey) {
      throw new Error('FINNHUB_API_KEY environment variable is required');
    }
    console.log(`📊 EarningsDataService initialized with Finnhub API`);
    this.setupAxios();
  }

  private setupAxios(): void {
    axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    axios.defaults.timeout = 30000;
  }

  async getUpcomingEarnings(daysAhead: number = 7): Promise<EarningsEvent[]> {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      
      const startDate = new Date();
      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];

      console.log(`📅 Fetching upcoming earnings from ${fromDate} to ${toDate} via Finnhub`);

      const response = await axios.get(`${this.baseUrl}/calendar/earnings`, {
        params: {
          from: fromDate,
          to: toDate,
          token: this.finnhubKey
        }
      });

      const earningsData = response.data?.earningsCalendar || [];
      
      const earnings: EarningsEvent[] = earningsData.map((earning: any) => ({
        symbol: earning.symbol,
        company: earning.symbol, // Finnhub doesn't provide company name in calendar
        date: earning.date,
        time: this.determineEarningsTime(earning.hour),
        estimatedEPS: earning.epsEstimate,
        actualEPS: earning.epsActual,
        estimatedRevenue: earning.revenueEstimate,
        actualRevenue: earning.revenueActual,
        sector: 'Unknown'
      }));

      console.log(`📊 Found ${earnings.length} upcoming earnings events`);
      return earnings.slice(0, 20);

    } catch (error) {
      console.error('❌ Error fetching upcoming earnings from Finnhub:', error);
      throw new Error('Failed to fetch real earnings data from Finnhub');
    }
  }

  async getUpcomingIPOs(daysAhead: number = 30): Promise<IPOEvent[]> {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      
      const startDate = new Date();
      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];

      console.log(`📈 Fetching upcoming IPOs from ${fromDate} to ${toDate} via Finnhub`);
      
      const response = await axios.get(`${this.baseUrl}/calendar/ipo`, {
        params: {
          from: fromDate,
          to: toDate,
          token: this.finnhubKey
        }
      });

      const ipoData = response.data?.ipoCalendar || [];
      
      const ipos: IPOEvent[] = ipoData.map((ipo: any) => ({
        symbol: ipo.symbol,
        company: ipo.name || ipo.symbol,
        date: ipo.date,
        priceRange: {
          low: ipo.priceFrom || 0,
          high: ipo.priceTo || 0
        },
        shares: ipo.numberOfShares || 0,
        marketCap: ipo.totalSharesValue || 0,
        sector: ipo.sector || 'Unknown',
        underwriter: ipo.underwriter || 'Unknown'
      }));

      console.log(`📊 Found ${ipos.length} upcoming IPOs`);
      return ipos;
      
    } catch (error) {
      console.error('❌ Error fetching IPO data from Finnhub:', error);
      throw new Error('Failed to fetch real IPO data from Finnhub');
    }
  }

  async getHistoricalEarnings(symbol: string, quarters: number = 8): Promise<HistoricalEarningsData[]> {
    try {
      console.log(`📋 Fetching historical earnings for ${symbol} (${quarters} quarters) via Finnhub`);

      const response = await axios.get(`${this.baseUrl}/stock/earnings`, {
        params: {
          symbol: symbol,
          token: this.finnhubKey
        }
      });

      const earningsHistory = response.data || [];
      
      const historicalData: HistoricalEarningsData[] = earningsHistory.slice(0, quarters).map((earning: any, index: number) => {
        const surprise = earning.epsEstimate && earning.epsEstimate !== 0 
          ? ((earning.epsActual - earning.epsEstimate) / Math.abs(earning.epsEstimate)) * 100 
          : 0;

        return {
          symbol,
          quarter: earning.quarter || `Q${4 - (index % 4)}`,
          year: earning.year || new Date().getFullYear(),
          actualEPS: earning.epsActual || 0,
          estimatedEPS: earning.epsEstimate || 0,
          surprise: surprise,
          priceChangePre: 0, // Would need separate price API call
          priceChangePost: 0, // Would need separate price API call  
          volume: 0, // Would need separate volume API call
          marketCap: 0 // Would need separate market cap API call
        };
      });

      console.log(`📊 Retrieved ${historicalData.length} historical earnings records for ${symbol}`);
      return historicalData;

    } catch (error) {
      console.error(`❌ Error fetching historical earnings for ${symbol} from Finnhub:`, error);
      throw new Error(`Failed to fetch real historical earnings data for ${symbol} from Finnhub`);
    }
  }

  private determineEarningsTime(hour: string | number): 'pre-market' | 'after-market' | 'during-market' {
    if (typeof hour === 'string') {
      // Handle Finnhub's time format
      if (hour === 'bmo' || hour === 'before market open') return 'pre-market';
      if (hour === 'amc' || hour === 'after market close') return 'after-market';
      return 'during-market';
    }
    
    // Handle numeric hour
    const hourNum = typeof hour === 'number' ? hour : parseInt(hour);
    if (hourNum < 9) return 'pre-market';
    if (hourNum >= 16) return 'after-market';
    return 'during-market';
  }

}