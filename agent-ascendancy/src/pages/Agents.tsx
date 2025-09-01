import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Brain, AlertCircle } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';

const Agents = () => {
  const { data: agents, isLoading, error } = useAgents();
  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">AI Trading Agents</h1>
        <p className="text-muted-foreground">Meet our sophisticated AI traders and their unique strategies</p>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Unable to load agents</p>
              <p className="text-sm text-red-600">Please check your connection and try again.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="p-8">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-12 h-12 rounded" />
                    <div>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <Skeleton className="w-20 h-6 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </Card>
          ))
        ) : agents && agents.length > 0 ? (
          agents.map((agent) => (
          <Card key={agent.id} className="p-8 bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300 hover:scale-[1.02]">
            <div className="space-y-6">
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{agent.avatar}</div>
                  <div>
                    <h3 className="text-xl font-bold">{agent.name}</h3>
                    <p className="text-muted-foreground">{agent.strategy}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant={agent.riskLevel === 'Low' ? 'secondary' : agent.riskLevel === 'Medium' ? 'default' : 'destructive'}>
                    {agent.riskLevel} Risk
                  </Badge>
                  {agent.isActive && (
                    <div className="flex items-center space-x-1 text-sm text-profit">
                      <div className="w-2 h-2 bg-profit rounded-full animate-pulse"></div>
                      <span>Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {agent.description}
              </p>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Portfolio Value</p>
                  <p className="text-lg font-bold">${agent.currentValue.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Return</p>
                  <p className={`text-lg font-bold ${agent.totalReturnPercentage >= 0 ? 'profit' : 'loss'}`}>
                    {agent.totalReturnPercentage >= 0 ? '+' : ''}{agent.totalReturnPercentage.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-bold">{agent.winRate.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-lg font-bold">{agent.totalTrades}</p>
                </div>
              </div>

              {/* Current Positions */}
              {agent.positions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Current Positions</span>
                  </h4>
                  <div className="space-y-2">
                    {agent.positions.map((position) => (
                      <div key={position.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                        <div>
                          <p className="font-medium">{position.symbol}</p>
                          <p className="text-sm text-muted-foreground">{position.quantity} shares</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${position.unrealizedPnLPercentage >= 0 ? 'profit' : 'loss'}`}>
                            {position.unrealizedPnLPercentage >= 0 ? '+' : ''}{position.unrealizedPnLPercentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${position.marketValue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Trade */}
              {agent.lastTrade && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Latest Trade</span>
                  </h4>
                  <div className="p-4 rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded ${
                          agent.lastTrade.action === 'BUY' ? 'bg-profit/20' : 'bg-loss/20'
                        }`}>
                          {agent.lastTrade.action === 'BUY' ? (
                            <TrendingUp className="h-3 w-3 text-profit" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-loss" />
                          )}
                        </div>
                        <span className="font-medium">
                          {agent.lastTrade.action} {agent.lastTrade.symbol}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(agent.lastTrade.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {agent.lastTrade.quantity} shares @ ${agent.lastTrade.price.toFixed(2)}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {agent.lastTrade.reasoning}
                    </p>
                    {agent.lastTrade.confidence && (
                      <div className="mt-2 flex items-center space-x-2">
                        <Brain className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Confidence: {agent.lastTrade.confidence}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground text-lg">No agents found</p>
            <p className="text-muted-foreground text-sm mt-2">Check back later for active trading agents</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Agents;