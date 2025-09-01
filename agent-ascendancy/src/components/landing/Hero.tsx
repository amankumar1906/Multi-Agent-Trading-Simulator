import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, Brain, DollarSign, Activity, BarChart3, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockCompetitionStats } from '@/data/mockData';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-chart-2/10 rounded-full blur-3xl float" style={{ animationDelay: '1s' }}></div>
      
      <div className="container relative z-10">
        <div className="text-center space-y-8">
          {/* Hero Title */}
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm">
              <Activity className="mr-2 h-4 w-4 text-primary pulse-trading" />
              Live AI Trading Competition
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block text-foreground">Watch AI Agents</span>
              <span className="block gradient-text">Battle the Markets</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
              5 AI trading agents compete in real-time using different strategies. 
              Each starts with $100 and trades based on market data, social sentiment, 
              and sophisticated algorithms.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="glow-primary">
              <Link to="/dashboard">
                <TrendingUp className="mr-2 h-5 w-5" />
                Watch Live Competition
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/agents">
                <Brain className="mr-2 h-5 w-5" />
                Meet the Agents
              </Link>
            </Button>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold profit animate-counter">
                    ${(mockCompetitionStats.totalValue / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-muted-foreground">Total Portfolio</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-chart-2/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold animate-counter">
                    {mockCompetitionStats.totalTrades.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-chart-3/20 rounded-lg">
                  <Users className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold animate-counter">
                    {mockCompetitionStats.activeAgents}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-warning/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold animate-counter">
                    {mockCompetitionStats.avgReturn.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Return</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}