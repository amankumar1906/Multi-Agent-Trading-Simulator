import { Trade } from './types'

export interface TradeWithPnL extends Trade {
  profitLoss?: number
  profitLossPercentage?: number
  buyPrice?: number
  sellPrice?: number
}

export const calculateTradeProfitLoss = (trades: Trade[]): TradeWithPnL[] => {
  const tradesMap = new Map<string, Trade[]>()
  
  // Group trades by symbol for each agent
  trades.forEach(trade => {
    const key = `${trade.agentId}_${trade.symbol}`
    if (!tradesMap.has(key)) {
      tradesMap.set(key, [])
    }
    tradesMap.get(key)!.push(trade)
  })

  // Calculate profit/loss for SELL trades
  return trades.map(trade => {
    const enhancedTrade: TradeWithPnL = { ...trade }
    
    if (trade.action === 'SELL') {
      const key = `${trade.agentId}_${trade.symbol}`
      const symbolTrades = tradesMap.get(key) || []
      
      // Find the most recent BUY trade before this SELL trade
      const buyTrade = symbolTrades
        .filter(t => 
          t.action === 'BUY' && 
          new Date(t.timestamp) < new Date(trade.timestamp)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      
      if (buyTrade) {
        enhancedTrade.buyPrice = buyTrade.price
        enhancedTrade.sellPrice = trade.price
        enhancedTrade.profitLoss = (trade.price - buyTrade.price) * trade.quantity
        enhancedTrade.profitLossPercentage = ((trade.price - buyTrade.price) / buyTrade.price) * 100
      }
    }
    
    return enhancedTrade
  })
}

export const formatProfitLoss = (amount: number, showSign: boolean = true): string => {
  const sign = showSign && amount >= 0 ? '+' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

export const formatProfitLossPercentage = (percentage: number, showSign: boolean = true): string => {
  const sign = showSign && percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(2)}%`
}

export const getProfitLossColor = (amount: number): string => {
  return amount >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'
}