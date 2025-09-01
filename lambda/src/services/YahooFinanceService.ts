import axios from 'axios';

export class YahooFinanceService {
  private readonly baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

  constructor() {}

  async getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      try {
        const price = await this.getCurrentPrice(symbol);
        if (price) {
          prices[symbol] = price;
        }
      } catch (error) {
        console.warn(`Failed to get price for ${symbol}:`, error);
      }
      
      // Small delay to avoid rate limiting
      await this.delay(100);
    }

    return prices;
  }

  async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/${symbol}`, {
        params: {
          interval: '1d',
          range: '1d'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const result = response.data.chart.result[0];
      
      if (result && result.meta && result.meta.regularMarketPrice) {
        return result.meta.regularMarketPrice;
      }

      // Fallback: try to get the last close price
      if (result && result.indicators && result.indicators.quote && result.indicators.quote[0].close) {
        const closes = result.indicators.quote[0].close.filter((price: number) => price !== null);
        if (closes.length > 0) {
          return closes[closes.length - 1];
        }
      }

      console.warn(`No price data found for ${symbol}`);
      return null;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.warn(`Symbol ${symbol} not found`);
        } else if (error.response?.status === 429) {
          console.warn(`Rate limited for ${symbol}, retrying...`);
          await this.delay(1000);
          return this.getCurrentPrice(symbol); // Retry once
        } else {
          console.error(`HTTP error for ${symbol}: ${error.response?.status}`);
        }
      } else {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
      return null;
    }
  }

  async getHistoricalPrices(symbol: string, days: number = 30): Promise<{date: string, price: number}[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/${symbol}`, {
        params: {
          interval: '1d',
          range: `${days}d`
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const result = response.data.chart.result[0];
      
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
        throw new Error('Invalid response format');
      }

      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      const historicalData: {date: string, price: number}[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const price = closes[i];
        if (price !== null && price !== undefined) {
          const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
          historicalData.push({ date, price });
        }
      }

      return historicalData;

    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  async getMarketStatus(): Promise<{
    isOpen: boolean;
    nextClose: string;
    nextOpen: string;
  }> {
    try {
      // Use SPY as a proxy for market status
      const response = await axios.get(`${this.baseUrl}/SPY`, {
        params: {
          interval: '1d',
          range: '1d'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const result = response.data.chart.result[0];
      const meta = result.meta;

      return {
        isOpen: meta.tradingPeriod.regular[0].start * 1000 <= Date.now() && 
                Date.now() <= meta.tradingPeriod.regular[0].end * 1000,
        nextClose: new Date(meta.tradingPeriod.regular[0].end * 1000).toISOString(),
        nextOpen: new Date(meta.tradingPeriod.regular[0].start * 1000).toISOString()
      };

    } catch (error) {
      console.error('Error getting market status:', error);
      return {
        isOpen: false,
        nextClose: '',
        nextOpen: ''
      };
    }
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      const price = await this.getCurrentPrice(symbol);
      return price !== null;
    } catch (error) {
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}