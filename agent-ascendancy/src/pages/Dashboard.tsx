import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { useAgents, useRecentTrades, useCompetitionStats } from '@/hooks/useAgents';
import { formatProfitLoss, formatProfitLossPercentage, getProfitLossColor } from '@/lib/tradeUtils';

const Dashboard = () => {
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useAgents();
  const { data: recentTrades, isLoading: tradesLoading } = useRecentTrades(5);
  const { data: competitionStats, isLoading: statsLoading } = useCompetitionStats();

  const sortedAgents = agents ? [...agents].sort((a, b) => b.totalReturnPercentage - a.totalReturnPercentage) : [];

  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <p className="text-muted-foreground">Live competition overview and performance metrics</p>
      </div>

      {/* Error State */}
      {agentsError && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Unable to load data</p>
              <p className="text-sm text-red-600">Please check your connection and try again.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Competition Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold profit">
                  ${competitionStats ? (competitionStats.totalValue / 1000).toFixed(0) : '0'}K
                </p>
              )}
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-chart-2/20 rounded-lg">
              <Activity className="h-6 w-6 text-chart-2" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold">
                  {competitionStats?.totalTrades || 0}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-profit/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-profit" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold profit">
                  {competitionStats ? competitionStats.avgReturn.toFixed(1) : '0.0'}%
                </p>
              )}
              <p className="text-sm text-muted-foreground">Average Return</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-warning/20 rounded-lg">
              <Activity className="h-6 w-6 text-warning pulse-trading" />
            </div>
            <div>
              {statsLoading ? (
                <Skeleton className="h-8 w-8 mb-1" />
              ) : (
                <p className="text-2xl font-bold">
                  {competitionStats?.activeAgents || 0}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Agent Leaderboard</h2>
          <div className="space-y-4">
            {agentsLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-6 w-16 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))
            ) : sortedAgents.length > 0 ? (
              sortedAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{agent.avatar}</div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.strategy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ color: agent.totalReturnPercentage >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))' }}>
                      {agent.totalReturnPercentage >= 0 ? '+' : ''}{agent.totalReturnPercentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${agent.currentValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No agents found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Recent Trading Activity</h2>
          <div className="space-y-4">
            {tradesLoading ? (
              // Loading skeletons for trades
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            ) : recentTrades && recentTrades.length > 0 ? (
              recentTrades.map((trade) => (
                <div key={trade.id} className="p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        trade.action === 'BUY' ? 'bg-profit/20' : trade.action === 'SELL' ? 'bg-loss/20' : 'bg-muted/20'
                      }`}>
                        {trade.action === 'BUY' ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : trade.action === 'SELL' ? (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        ) : (
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium">{trade.symbol}</p>
                          <Badge variant="outline" className="text-xs">
                            {trade.action}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{trade.companyName}</p>
                        <p className="text-xs text-muted-foreground">{trade.agentName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Quantity & Price</p>
                      <p className="font-medium">{trade.quantity} @ ${trade.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Value</p>
                      <p className="font-medium">${trade.totalValue.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Profit/Loss for SELL trades */}
                  {trade.action === 'SELL' && trade.profitLoss !== undefined && (
                    <div className="mt-3 p-3 rounded-lg bg-background/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Profit/Loss</p>
                          <p className="text-xs text-muted-foreground">
                            Bought @ ${trade.buyPrice?.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: getProfitLossColor(trade.profitLoss) }}>
                            {formatProfitLoss(trade.profitLoss)}
                          </p>
                          <p className="text-sm" style={{ color: getProfitLossColor(trade.profitLossPercentage || 0) }}>
                            {formatProfitLossPercentage(trade.profitLossPercentage || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confidence Score */}
                  {trade.confidence && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Confidence: {trade.confidence.toFixed(0)}%
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent trades</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
};

export default Dashboard;