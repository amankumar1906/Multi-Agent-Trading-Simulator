import { useQuery } from '@tanstack/react-query'
import { ApiService } from '@/lib/api'

export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: ApiService.getAgents,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  })
}

export const useRecentTrades = (limit: number = 50) => {
  return useQuery({
    queryKey: ['recentTrades', limit],
    queryFn: () => ApiService.getRecentTrades(limit),
    refetchInterval: 10000, // Refresh every 10 seconds for live trading
    staleTime: 5000
  })
}

export const usePerformanceData = (days: number = 30) => {
  return useQuery({
    queryKey: ['performanceData', days],
    queryFn: () => ApiService.getPerformanceData(days),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  })
}

export const useCompetitionStats = () => {
  return useQuery({
    queryKey: ['competitionStats'],
    queryFn: ApiService.getCompetitionStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000
  })
}