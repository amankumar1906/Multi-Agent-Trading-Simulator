import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, Activity, Brain, History } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary glow-primary" />
            <span className="font-bold text-xl gradient-text">AI Traders</span>
          </div>
        </div>
        
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link 
            to="/" 
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Home
          </Link>
          <Link 
            to="/dashboard" 
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center space-x-1"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/agents" 
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center space-x-1"
          >
            <Brain className="h-4 w-4" />
            <span>Agents</span>
          </Link>
          <Link 
            to="/live" 
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center space-x-1"
          >
            <Activity className="h-4 w-4 pulse-trading" />
            <span>Live</span>
          </Link>
          <Link 
            to="/trades" 
            className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center space-x-1"
          >
            <History className="h-4 w-4" />
            <span>Trades</span>
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-muted-foreground">Live Trading</span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Watch Competition
          </Button>
        </div>
      </div>
    </header>
  );
}