import {
  DASHBOARD_PERIOD_LABELS,
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  DEFAULT_DASHBOARD_PERIOD,
} from '@nexus/shared';
import { CalendarRange, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { RoleBadge } from '@/components/role-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import { DistributionChart } from '@/features/dashboard/components/charts/distribution-chart';
import { RevenueChart } from '@/features/dashboard/components/charts/revenue-chart';
import { SalesChart } from '@/features/dashboard/components/charts/sales-chart';
import { SellersChart } from '@/features/dashboard/components/charts/sellers-chart';
import { StagesChart } from '@/features/dashboard/components/charts/stages-chart';
import { KpiGrid } from '@/features/dashboard/components/kpi-grid';
import {
  RecentActivitiesCard,
  RecentDealsCard,
  UpcomingTasksCard,
} from '@/features/dashboard/components/recent-lists';
import { useDashboard } from '@/features/dashboard/hooks';
import { PERIOD_PARAM, parsePeriod, rangeFor } from '@/features/dashboard/period';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatIsoDate, getFirstName, greeting } from '@/lib/format';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const me = useCurrentUser();
  const organization = me.activeOrganization!;
  const teamView = usePermission('deals:read-all');
  const [searchParams, setSearchParams] = useSearchParams();
  const period = parsePeriod(searchParams.get(PERIOD_PARAM));
  const range = useMemo(() => rangeFor(period), [period]);
  const dashboard = useDashboard(range);
  const summary = dashboard.data;

  const changePeriod = (value: string) =>
    setSearchParams(value === DEFAULT_DASHBOARD_PERIOD ? {} : { [PERIOD_PARAM]: value }, {
      replace: true,
    });

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
            <Select value={period} onValueChange={changePeriod}>
              <SelectTrigger className="w-44" aria-label="Período dos indicadores">
                <CalendarRange />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {DASHBOARD_PERIODS.map((item: DashboardPeriod) => (
                  <SelectItem key={item} value={item}>
                    {DASHBOARD_PERIOD_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
