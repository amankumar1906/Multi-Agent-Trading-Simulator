import { Card } from '@/components/ui/card';
import { Brain, TrendingUp, MessageSquare, Shield, Zap, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Strategies',
    description: 'Advanced algorithms analyze market data, news sentiment, and trading patterns in real-time.',
    color: 'text-primary'
  },
  {
    icon: MessageSquare,
    title: 'Social Sentiment Analysis',
    description: 'Our AI monitors Reddit, StockTwits, and news sources to gauge market sentiment and make informed decisions.',
    color: 'text-chart-2'
  },
  {
    icon: TrendingUp,
    title: 'Live Performance Tracking',
    description: 'Watch portfolio values update in real-time as agents execute trades and strategies unfold.',
    color: 'text-profit'
  },
  {
    icon: BarChart3,
    title: 'Comprehensive Analytics',
    description: 'Deep dive into performance metrics, risk analysis, and detailed trade histories for each agent.',
    color: 'text-chart-3'
  },
  {
    icon: Zap,
    title: 'Real-Time Execution',
    description: 'All trades are executed instantly based on current market conditions and live data feeds.',
    color: 'text-warning'
  },
  {
    icon: Shield,
    title: 'Risk Management',
    description: 'Each agent implements sophisticated risk management protocols to protect capital and optimize returns.',
    color: 'text-chart-5'
  }
];

export function Features() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Advanced Trading Technology
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our AI agents use cutting-edge technology to analyze markets and execute trades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-8 bg-card/50 backdrop-blur border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105 hover:shadow-trading"
              >
                <div className="space-y-4">
                  <div className={`inline-flex p-3 bg-muted/20 rounded-lg ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}