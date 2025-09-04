import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Activity, Filter, Calendar, DollarSign, AlertCircle, Brain } from 'lucide-react';
import { useRecentTrades } from '@/hooks/useAgents';
import { formatProfitLoss, formatProfitLossPercentage, getProfitLossColor } from '@/lib/tradeUtils';
import type { TradeWithPnL } from '@/lib/types';

const Trades = () => {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [limit, setLimit] = useState(50);
  const { data: trades, isLoading, error } = useRecentTrades(limit);
  
  const filteredTrades = trades?.filter(trade => 
    filter === 'ALL' || trade.action === filter
  ) || [];

  const totalProfit = filteredTrades
    .filter(trade => trade.profitLoss !== undefined)
    .reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);

  const profitableTrades = filteredTrades.filter(trade => 
    trade.profitLoss !== undefined && trade.profitLoss > 0
  ).length;

  const totalSellTrades = filteredTrades.filter(trade => trade.action === 'SELL').length;
  const winRate = totalSellTrades > 0 ? (profitableTrades / totalSellTrades) * 100 : 0;

  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Trade History</h1>
          <p className="text-muted-foreground">Complete trading activity with profit/loss analysis</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Unable to load trades</p>
              <p className="text-sm text-red-600">Please check your connection and try again.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredTrades.length}</p>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${totalProfit >= 0 ? 'bg-profit/20' : 'bg-loss/20'}`}>
              <DollarSign className={`h-6 w-6 ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: getProfitLossColor(totalProfit) }}>
                {formatProfitLoss(totalProfit)}
              </p>
              <p className="text-sm text-muted-foreground">Total P&L</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-chart-2/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-warning/20 rounded-lg">
              <TrendingDown className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{profitableTrades}</p>
              <p className="text-sm text-muted-foreground">Profitable Trades</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>
        
        <Select value={filter} onValueChange={(value: 'ALL' | 'BUY' | 'SELL') => setFilter(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Trades</SelectItem>
            <SelectItem value="BUY">Buy Only</SelectItem>
            <SelectItem value="SELL">Sell Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">Last 25</SelectItem>
            <SelectItem value="50">Last 50</SelectItem>
            <SelectItem value="100">Last 100</SelectItem>
            <SelectItem value="200">Last 200</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trades List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Trading Activity</h2>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))
          ) : filteredTrades.length > 0 ? (
            filteredTrades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No trades found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter !== 'ALL' ? `Try changing the filter or ` : ''}Check back later for trading activity
              </p>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
};

interface TradeCardProps {
  trade: TradeWithPnL;
}

const TradeCard = ({ trade }: TradeCardProps) => {
  return (
    <div className="p-4 rounded-lg border bg-background hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${
            trade.action === 'BUY' ? 'bg-profit/20' : 'bg-loss/20'
          }`}>
            {trade.action === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-profit" />
            ) : (
              <TrendingDown className="h-5 w-5 text-loss" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-bold text-lg">{trade.symbol}</h3>
              <Badge variant={trade.action === 'BUY' ? 'default' : 'secondary'}>
                {trade.action}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{trade.companyName}</p>
            <p className="text-xs text-muted-foreground">{trade.agentName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            <Calendar className="h-3 w-3 inline mr-1" />
            {new Date(trade.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Quantity</p>
          <p className="font-semibold">{trade.quantity} shares</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Price</p>
          <p className="font-semibold">${trade.price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="font-semibold">${trade.totalValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Confidence</p>
          <p className="font-semibold">{trade.confidence.toFixed(0)}%</p>
        </div>
      </div>

      {/* Profit/Loss Section for SELL trades */}
      {trade.action === 'SELL' && trade.profitLoss !== undefined && (
        <div className="mb-4 p-4 rounded-lg bg-muted/30">
          <h4 className="font-semibold mb-3 flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Profit & Loss Analysis</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Buy Price</p>
              <p className="font-medium">${trade.buyPrice?.toFixed(2) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sell Price</p>
              <p className="font-medium">${trade.sellPrice?.toFixed(2) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <p className="font-bold text-lg" style={{ color: getProfitLossColor(trade.profitLoss) }}>
                {formatProfitLoss(trade.profitLoss)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Return %</p>
              <p className="font-bold text-lg" style={{ color: getProfitLossColor(trade.profitLossPercentage || 0) }}>
                {formatProfitLossPercentage(trade.profitLossPercentage || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reasoning Section */}
      {trade.reasoning && (
        <div className="p-4 rounded-lg bg-background/50">
          <h4 className="font-semibold mb-2 flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Reasoning</span>
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {trade.reasoning}
          </p>
        </div>
      )}
    </div>
  );
};

export default Trades;