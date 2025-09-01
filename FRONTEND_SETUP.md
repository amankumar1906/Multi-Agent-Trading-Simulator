# Frontend Setup & Deployment Guide

## Overview
This guide will help you set up and run the AI Investment Agents frontend dashboard that connects to your Supabase database and displays real-time trading data.

## Prerequisites
- Node.js 18+ installed
- npm or bun package manager
- Your Supabase project credentials
- Lambda function deployed and running

## Installation

### 1. Navigate to Frontend Directory
```bash
cd agent-ascendancy
```

### 2. Install Dependencies
```bash
npm install
# or
bun install
```

### 3. Environment Configuration

Create a `.env.local` file in the `agent-ascendancy` directory:

```env
VITE_SUPABASE_URL=https://kffonmukfyyzgjlxqvre.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZm9ubXVrZnl5emdqbHhxdnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2ODQ5MjMsImV4cCI6MjA3MjI2MDkyM30.SBUDhcenOKP6ZwLe3qG6nAXX4ypWg6X8MdmqJ37w1M4
```

**Note:** These credentials are already configured. The anon key is safe for frontend use.

## Development

### Start Development Server
```bash
npm run dev
# or
bun run dev
```

The frontend will be available at `http://localhost:8080`

## Features

### 📊 **Dashboard**
- Live portfolio values and performance metrics
- Agent leaderboard with real-time rankings  
- Recent trading activity feed
- Competition statistics

### 🤖 **Agents Page**
- Detailed agent profiles with strategies
- Current positions and performance
- Last trade details with reasoning
- Risk level indicators

### ⚡ **Live Trading**
- Real-time trade feed with sentiment scores
- Trade notifications and reasoning
- Market data overview
- Confidence indicators

### 📈 **Analytics**
- Portfolio performance charts over time
- Trading statistics and metrics
- Risk analysis and win rates
- Historical data visualization

## Data Integration

### Real-Time Updates
The frontend automatically refreshes data:
- **Agents & Stats**: Every 30 seconds
- **Recent Trades**: Every 10 seconds  
- **Live Feed**: Every 10 seconds
- **Performance Data**: Every minute

### Database Schema
The frontend connects to these Supabase tables:
- `agents` - Agent information and performance
- `trades` - All trading activity
- `portfolio` - Current positions
- `daily_performance` - Historical performance

## Deployment Options

### Option 1: Vercel (Recommended - Free)

1. **Prepare for deployment:**
```bash
npm run build
```

2. **Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Option 2: Netlify (Free)

1. **Build the project:**
```bash
npm run build
```

2. **Deploy to Netlify:**
- Drag the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)
- Or connect your GitHub repo to Netlify

### Option 3: Static Hosting

1. **Build the project:**
```bash
npm run build
```

2. **Deploy the `dist` folder** to any static hosting service:
- GitHub Pages
- Firebase Hosting  
- AWS S3 + CloudFront
- Google Cloud Storage

## Production Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use your hosting provider's environment variable settings
- The `VITE_` prefix is required for Vite to include variables in the build

### Performance
- The app includes automatic loading states and error handling
- Data is cached for optimal performance
- Images and assets are optimized
- Bundle size is minimized with tree shaking

### Security
- Only the anon key is used on the frontend (safe for public)
- No sensitive credentials are exposed
- CORS is configured properly in Supabase

## Troubleshooting

### Common Issues

**1. "Unable to load data" errors:**
- Check your `.env.local` file exists and has correct credentials
- Verify your Supabase project is active
- Ensure your Lambda function is running daily

**2. Empty data/charts:**
- Make sure your Lambda function has executed at least once
- Check the `agents` table has the agent entry
- Verify trades are being recorded in the database

**3. Build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Update dependencies: `npm update`
- Check TypeScript errors: `npm run lint`

**4. Development server issues:**
- Port 8080 already in use? The server will find another port
- Try: `npm run dev -- --port 3000` to use a specific port

### Database Connection Test
You can test the connection by checking the browser's Network tab:
- Should see successful requests to your Supabase URL
- 200 status codes indicate successful data fetching
- 401/403 errors indicate authentication issues

### Support
If you encounter issues:
1. Check the browser console for error messages
2. Verify your Lambda function logs in AWS CloudWatch
3. Test your Supabase connection in the Supabase dashboard

## Next Steps
- Your frontend is now connected to live data
- The Lambda function runs daily at 2 PM ET
- Monitor the dashboard for real trading activity
- Consider adding more agents or strategies to the competition

## Tech Stack Summary
- **Framework**: React 18 + Vite
- **UI**: Tailwind CSS + Shadcn/ui components
- **Charts**: Recharts for data visualization
- **State Management**: TanStack Query for server state
- **Database**: Supabase PostgreSQL
- **Deployment**: Static hosting (Vercel recommended)