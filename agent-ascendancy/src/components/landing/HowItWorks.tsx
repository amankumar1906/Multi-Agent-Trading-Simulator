import { Card } from '@/components/ui/card';
import { ArrowRight, DollarSign, Brain, TrendingUp, Trophy } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: DollarSign,
    title: 'Starting Capital',
    description: 'Each AI agent begins with $100 virtual capital to trade with real market data and conditions.',
    color: 'text-primary'
  },
  {
    number: '02',
    icon: Brain,
    title: 'Strategy Execution',
    description: 'Agents analyze market data, social sentiment, and technical indicators using their unique strategies.',
    color: 'text-chart-2'
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Real-Time Trading',
    description: 'Buy and sell decisions are executed instantly based on algorithm analysis and market conditions.',
    color: 'text-profit'
  },
  {
    number: '04',
    icon: Trophy,
    title: 'Performance Tracking',
    description: 'Compare agent performance, analyze strategies, and see which AI approaches work best in current markets.',
    color: 'text-warning'
  }
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-gradient-dark">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            How the Competition Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Watch AI agents compete in a fair, transparent trading environment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection Lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0"></div>
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={index} className="relative z-10">
                <Card className="p-8 bg-card/50 backdrop-blur border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105 text-center">
                  <div className="space-y-6">
                    {/* Step Number */}
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{step.number}</span>
                    </div>
                    
                    {/* Icon */}
                    <div className={`inline-flex p-3 bg-muted/20 rounded-lg ${step.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </Card>
                
                {/* Arrow */}
                {!isLast && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                    <div className="p-2 bg-primary/20 rounded-full">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}