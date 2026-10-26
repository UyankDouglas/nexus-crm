import { type DashboardPeriod, type DateRange, DEFAULT_DASHBOARD_PERIOD } from '@nexus/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { queryKeys } from '@/lib/query-keys';
import { dashboardService } from '@/services/dashboard.service';
import { PERIOD_PARAM, parsePeriod, rangeFor } from './period';

export function useDashboard(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(range),
    queryFn: ({ signal }) => dashboardService.summary(range, signal),
    // Ao trocar o período, os gráficos atuais ficam visíveis até os novos chegarem.
    placeholderData: keepPreviousData,
  });
}

/** Período escolhido na URL (`?periodo=`), usado pelo dashboard e pelos relatórios. */
export function usePeriodParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = parsePeriod(searchParams.get(PERIOD_PARAM));
  const range = useMemo(() => rangeFor(period), [period]);
  const setPeriod = (value: DashboardPeriod) =>
    setSearchParams(value === DEFAULT_DASHBOARD_PERIOD ? {} : { [PERIOD_PARAM]: value }, {
      replace: true,
    });
  return { period, range, setPeriod };
}
