import { DASHBOARD_PERIOD_LABELS } from '@nexus/shared';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { RoleBadge } from '@/components/role-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import { DistributionChart } from '@/features/dashboard/components/charts/distribution-chart';
import { RevenueChart } from '@/features/dashboard/components/charts/revenue-chart';
import { SalesChart } from '@/features/dashboard/components/charts/sales-chart';
import { SellersChart } from '@/features/dashboard/components/charts/sellers-chart';
import { StagesChart } from '@/features/dashboard/components/charts/stages-chart';
import { KpiGrid } from '@/features/dashboard/components/kpi-grid';
import { PeriodSelect } from '@/features/dashboard/components/period-select';
import {
  RecentActivitiesCard,
  RecentDealsCard,
  UpcomingTasksCard,
} from '@/features/dashboard/components/recent-lists';
import { useDashboard, usePeriodParam } from '@/features/dashboard/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatIsoDate, getFirstName, greeting } from '@/lib/format';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const me = useCurrentUser();
  const organization = me.activeOrganization!;
  const teamView = usePermission('deals:read-all');
  const { period, range, setPeriod } = usePeriodParam();
  const dashboard = useDashboard(range);
  const summary = dashboard.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${getFirstName(me.user.name)}`}
        description={
          teamView
            ? `Visão comercial da ${organization.name}.`
            : `Sua carteira na ${organization.name}.`
        }
        actions={
          <>
            <RoleBadge role={organization.role} />
            <PeriodSelect value={period} onChange={setPeriod} label="Período dos indicadores" />
          </>
        }
      />

      {dashboard.isError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {dashboard.error.message}
            <Button size="sm" variant="outline" onClick={() => void dashboard.refetch()}>
              <RefreshCw />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div
        className="space-y-6 transition-opacity"
        style={{ opacity: dashboard.isPlaceholderData ? 0.6 : 1 }}
        aria-busy={dashboard.isFetching}
      >
        <KpiGrid summary={summary} periodLabel={DASHBOARD_PERIOD_LABELS[period]} />
        <p className="sr-only" aria-live="polite">
          Período de {formatIsoDate(range.from)} a {formatIsoDate(range.to)}.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesChart summary={summary} />
          </div>
          <DistributionChart summary={summary} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RevenueChart summary={summary} />
          <StagesChart summary={summary} />
        </div>
        <SellersChart summary={summary} teamView={teamView} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentDealsCard />
        <UpcomingTasksCard />
        <RecentActivitiesCard />
      </div>
    </div>
  );
}
