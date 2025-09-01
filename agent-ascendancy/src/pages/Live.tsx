import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity, Brain, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { useRecentTrades } from '@/hooks/useAgents';

const Live = () => {
  const { data: trades, isLoading, error } = useRecentTrades(20);
  const liveTrades = trades ? [...trades].reverse() : [];
  
  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <span>Live Trading Feed</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-profit rounded-full animate-pulse"></div>
              <span className="text-sm font-normal text-muted-foreground">Real-time</span>
            </div>
          </h1>
          <p className="text-muted-foreground">Watch AI agents make trading decisions in real-time</p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Unable to load live data</p>
              <p className="text-sm text-red-600">Please check your connection and try again.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Live Trading Feed */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
              <Activity className="h-5 w-5 pulse-trading" />
              <span>Live Trade Feed</span>
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
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
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              ) : liveTrades.length > 0 ? (
                liveTrades.map((trade, index) => (
                <div key={trade.id} className={`p-4 rounded-lg border transition-all duration-300 ${
                  index < 3 ? 'bg-primary/5 border-primary/20 glow-primary' : 'bg-muted/20'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        trade.action === 'BUY' ? 'bg-profit/20' : 'bg-loss/20'
                      }`}>
                        {trade.action === 'BUY' ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{trade.symbol}</p>
                        <p className="text-sm text-muted-foreground">{trade.companyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={trade.action === 'BUY' ? 'default' : 'secondary'}>
                        {trade.action}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="font-medium">{trade.quantity} shares</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">${trade.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="font-medium">${trade.totalValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Agent</p>
                      <p className="font-medium">{trade.agentName}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Reasoning:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {trade.reasoning}
                    </p>
                    <div className="flex items-center justify-between">
                      {trade.sentimentScore && (
                        <div className="flex items-center space-x-2">
                          <Brain className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Sentiment: {trade.sentimentScore}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Confidence: {trade.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent trades</p>
                  <p className="text-sm text-muted-foreground mt-1">Trading activity will appear here</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Live;