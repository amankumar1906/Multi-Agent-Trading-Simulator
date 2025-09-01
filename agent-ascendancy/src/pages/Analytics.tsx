import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Target, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAgents, useRecentTrades } from '@/hooks/useAgents';
import { PerformanceChart } from '@/components/charts/PerformanceChart';

const Analytics = () => {
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useAgents();
  const { data: trades, isLoading: tradesLoading } = useRecentTrades(100); // Get more trades for analysis

  const sortedAgents = agents ? [...agents].sort((a, b) => b.totalReturnPercentage - a.totalReturnPercentage) : [];
  const totalTrades = trades?.length || 0;
  const buyTrades = trades?.filter(t => t.action === 'BUY').length || 0;
  const sellTrades = trades?.filter(t => t.action === 'SELL').length || 0;
  const avgTradeSize = trades?.length ? trades.reduce((sum, t) => sum + t.totalValue, 0) / totalTrades : 0;

  return (
    <main className="container py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics & Performance</h1>
        <p className="text-muted-foreground">Deep dive into trading performance and risk analysis</p>
      </div>

      {/* Error States */}
      {(agentsError || tradesLoading) && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Unable to load analytics data</p>
              <p className="text-sm text-red-600">Please check your connection and try again.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Performance Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Portfolio Performance Over Time</h2>
        <PerformanceChart days={30} />
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-profit/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-profit" />
            </div>
            <div>
              {tradesLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold profit">
                  {totalTrades > 0 ? ((buyTrades / totalTrades) * 100).toFixed(1) : '0.0'}%
                </p>
              )}
              <p className="text-sm text-muted-foreground">Buy Rate</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-chart-2/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                ${(avgTradeSize / 1000).toFixed(1)}K
              </p>
              <p className="text-sm text-muted-foreground">Avg Trade Size</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-warning/20 rounded-lg">
              <Target className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                15.2%
              </p>
              <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-loss/20 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-loss" />
            </div>
            <div>
              <p className="text-2xl font-bold loss">
                -8.4%
              </p>
              <p className="text-sm text-muted-foreground">Max Drawdown</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Analysis */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Agent Performance Analysis</h2>
          <div className="space-y-6">
            {sortedAgents.map((agent, index) => (
              <div key={agent.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{agent.avatar}</div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.strategy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${agent.totalReturnPercentage >= 0 ? 'profit' : 'loss'}`}>
                      {agent.totalReturnPercentage >= 0 ? '+' : ''}{agent.totalReturnPercentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${agent.currentValue.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Trades</p>
                    <p className="font-medium">{agent.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Win Rate</p>
                    <p className="font-medium">{agent.winRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk</p>
                    <Badge variant={
                      agent.riskLevel === 'Low' ? 'secondary' : 
                      agent.riskLevel === 'Medium' ? 'default' : 'destructive'
                    }>
                      {agent.riskLevel}
                    </Badge>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      agent.totalReturnPercentage >= 20 ? 'bg-profit' :
                      agent.totalReturnPercentage >= 10 ? 'bg-warning' :
                      agent.totalReturnPercentage >= 0 ? 'bg-chart-2' : 'bg-loss'
                    }`}
                    style={{ width: `${Math.min(Math.abs(agent.totalReturnPercentage) * 2, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk Analysis */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Risk Analysis</h2>
          <div className="space-y-6">
            {/* Volatility Analysis */}
            <div className="space-y-4">
              <h3 className="font-medium">Portfolio Volatility</h3>
              {sortedAgents.map((agent) => (
                <div key={agent.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{agent.name}</span>
                    <span className={
                      agent.riskLevel === 'Low' ? 'text-profit' :
                      agent.riskLevel === 'Medium' ? 'text-warning' : 'text-loss'
                    }>
                      {agent.riskLevel === 'Low' ? '12.3%' : 
                       agent.riskLevel === 'Medium' ? '18.7%' : '24.9%'}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        agent.riskLevel === 'Low' ? 'bg-profit' :
                        agent.riskLevel === 'Medium' ? 'bg-warning' : 'bg-loss'
                      }`}
                      style={{ 
                        width: agent.riskLevel === 'Low' ? '30%' : 
                               agent.riskLevel === 'Medium' ? '60%' : '90%'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sector Allocation */}
            <div className="space-y-4">
              <h3 className="font-medium">Sector Allocation</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Technology</span>
                  <span className="text-sm font-medium">65%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-chart-1" style={{ width: '65%' }}></div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Financial</span>
                  <span className="text-sm font-medium">20%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-chart-2" style={{ width: '20%' }}></div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Healthcare</span>
                  <span className="text-sm font-medium">10%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-chart-3" style={{ width: '10%' }}></div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Other</span>
                  <span className="text-sm font-medium">5%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-chart-4" style={{ width: '5%' }}></div>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="space-y-4">
              <h3 className="font-medium">Risk Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Beta</p>
                  <p className="font-bold">1.23</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alpha</p>
                  <p className="font-bold profit">+2.8%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">VaR (95%)</p>
                  <p className="font-bold loss">-$2,340</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Correlation</p>
                  <p className="font-bold">0.76</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default Analytics;