import type { DateRange } from '@nexus/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  type ClosedDealsParams,
  type ExportParams,
  reportService,
} from '@/services/reports.service';
import { saveFile } from './download';

export function useReportsOverview(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.reports.overview(range),
    queryFn: ({ signal }) => reportService.overview(range, signal),
    placeholderData: keepPreviousData,
  });
}

export function useClosedDeals(params: ClosedDealsParams) {
  return useQuery({
    queryKey: queryKeys.reports.closedDeals(params),
    queryFn: ({ signal }) => reportService.closedDeals(params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Gera o arquivo na API e inicia o download; a exportação fica registrada na auditoria. */
export function useExportReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ExportParams) => reportService.export(params),
    onSuccess: (file) => {
      saveFile(file);
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
}
