import { useQuery } from '@tanstack/react-query'
import { ApiService } from '@/lib/api'

export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: ApiService.getAgents,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  })
}

export const useRecentTrades = (limit: number = 50) => {
  return useQuery({
    queryKey: ['recentTrades', limit],
    queryFn: () => ApiService.getRecentTrades(limit),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  })
}

export const usePerformanceData = (days: number = 30) => {
  return useQuery({
    queryKey: ['performanceData', days],
    queryFn: () => ApiService.getPerformanceData(days),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  })
}

export const useCompetitionStats = () => {
  return useQuery({
    queryKey: ['competitionStats'],
    queryFn: ApiService.getCompetitionStats,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false
  })
}