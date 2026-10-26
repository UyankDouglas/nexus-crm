import { DASHBOARD_PERIOD_LABELS } from '@nexus/shared';
import { Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { usePermission } from '@/features/auth/hooks';
import { PeriodSelect } from '@/features/dashboard/components/period-select';
import { usePeriodParam } from '@/features/dashboard/hooks';
import { ClosedDealsReport } from '@/features/reports/components/closed-deals-report';
import { LossReasons } from '@/features/reports/components/loss-reasons';
import { PipelineReport } from '@/features/reports/components/pipeline-report';
import { ReportSummary } from '@/features/reports/components/report-summary';
import { RevenueReport } from '@/features/reports/components/revenue-report';
import { SellersReport } from '@/features/reports/components/sellers-report';
import { useReportsOverview } from '@/features/reports/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatIsoDate } from '@/lib/format';
import { paths } from '@/lib/navigation';

export function ReportsPage() {
  useDocumentTitle('Relatórios');
  const canRead = usePermission('reports:read');
  return canRead ? <Reports /> : <RestrictedReports />;
}

/** Vendedores não acessam relatórios gerais (a API também recusa); o dashboard mostra a carteira. */
function RestrictedReports() {
  return (
    <Empty className="min-h-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Lock />
        </EmptyMedia>
        <EmptyTitle>Relatórios restritos</EmptyTitle>
        <EmptyDescription>
          Os relatórios comerciais estão disponíveis para gestores e administradores. Seus
          indicadores estão no dashboard.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to={paths.dashboard}>Ir para o dashboard</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function Reports() {
  const { period, range, setPeriod } = usePeriodParam();
  const report = useReportsOverview(range);
  const overview = report.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Resultados de ${DASHBOARD_PERIOD_LABELS[period].toLowerCase()} (${formatIsoDate(range.from)} a ${formatIsoDate(range.to)}) com a carteira atual. Exporte cada relatório em CSV ou Excel.`}
        actions={
          <PeriodSelect value={period} onChange={setPeriod} label="Período dos relatórios" />
        }
      />

      {report.isError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os relatórios</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {report.error.message}
            <Button size="sm" variant="outline" onClick={() => void report.refetch()}>
              <RefreshCw />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        className="space-y-6 transition-opacity"
        style={{ opacity: report.isPlaceholderData ? 0.6 : 1 }}
        aria-busy={report.isFetching}
      >
        <ReportSummary totals={overview?.totals} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RevenueReport overview={overview} range={range} />
          </div>
          <LossReasons reasons={overview?.lossReasons} />
        </div>
        <SellersReport sellers={overview?.sellers} range={range} />
        <PipelineReport overview={overview} range={range} />
      </div>

      <ClosedDealsReport key={`${range.from}:${range.to}`} range={range} />
    </div>
  );
}
