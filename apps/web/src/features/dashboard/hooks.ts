import type { DateRange } from '@nexus/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { dashboardService } from '@/services/dashboard.service';

export function useDashboard(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(range),
    queryFn: ({ signal }) => dashboardService.summary(range, signal),
    // Ao trocar o período, os gráficos atuais ficam visíveis até os novos chegarem.
    placeholderData: keepPreviousData,
  });
}
