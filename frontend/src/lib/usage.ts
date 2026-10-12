import { useQuery } from '@tanstack/react-query';
import { usageApi } from './api';

export const USAGE_QUERY_KEY = ['usage'] as const;

export function useUsageQuery(enabled = true) {
  return useQuery({
    queryKey: USAGE_QUERY_KEY,
    queryFn: usageApi.get,
    staleTime: 30_000,
    enabled,
  });
}
