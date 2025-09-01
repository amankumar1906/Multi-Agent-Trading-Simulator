import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePerformanceData } from '@/hooks/useAgents';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceChartProps {
  days?: number;
}

export const PerformanceChart = ({ days = 30 }: PerformanceChartProps) => {
  const { data: performanceData, isLoading } = usePerformanceData(days);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!performanceData || performanceData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border rounded-lg">
        <p className="text-muted-foreground">No performance data available</p>
      </div>
    );
  }

  // Group data by date and create chart data
  const chartData = performanceData.reduce((acc, curr) => {
    const date = curr.timestamp.split('T')[0]; // Get date part
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing[curr.agentId] = curr.value;
    } else {
      acc.push({
        date,
        [curr.agentId]: curr.value
      });
    }
    
    return acc;
  }, [] as any[]);

  // Get unique agent IDs for lines
  const agentIds = [...new Set(performanceData.map(d => d.agentId))];
  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip 
          formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, `Agent ${name}`]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        {agentIds.map((agentId, index) => (
          <Line
            key={agentId}
            type="monotone"
            dataKey={agentId}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};