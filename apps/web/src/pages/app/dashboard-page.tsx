import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { RoleBadge } from '@/components/role-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import { useCustomerStats } from '@/features/customers/hooks';
import { useDealStats } from '@/features/deals/hooks';
import { KpiGrid } from '@/features/dashboard/components/kpi-grid';
import { OrganizationCard } from '@/features/dashboard/components/organization-card';
import { TeamCompositionCard } from '@/features/dashboard/components/team-composition-card';
import {
  MembersTable,
  MembersTableSkeleton,
} from '@/features/organization/components/members-table';
import { useOrganizationMembers, useOrganizationSummary } from '@/features/organization/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatLongDate, getFirstName, greeting } from '@/lib/format';
import { paths } from '@/lib/navigation';

const MEMBERS_PREVIEW_LIMIT = 5;

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const me = useCurrentUser();
  const organization = me.activeOrganization!;
  const summary = useOrganizationSummary();
  const canReadMembers = usePermission('members:read');
  const members = useOrganizationMembers();
  const customerStats = useCustomerStats();
  const dealStats = useDealStats();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${getFirstName(me.user.name)}`}
        description={`Visão geral da ${organization.name}.`}
        actions={
          <>
            <RoleBadge role={organization.role} />
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
              <CalendarDays className="size-4" />
              {formatLongDate(new Date())}
            </span>
          </>
        }
      />

      <KpiGrid customerStats={customerStats.data} dealStats={dealStats.data} />

      {summary.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar os dados da organização</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {summary.error.message}
            <Button size="sm" variant="outline" onClick={() => void summary.refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {summary.data ? (
              <TeamCompositionCard summary={summary.data} />
            ) : (
              <Skeleton className="h-72 w-full rounded-xl" />
            )}
          </div>
          <div className="lg:col-span-2">
            {summary.data ? (
              <OrganizationCard summary={summary.data} organization={organization} />
            ) : (
              <Skeleton className="h-72 w-full rounded-xl" />
            )}
          </div>
        </div>
      )}

      {canReadMembers && (
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Membros com acesso à organização</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to={paths.settings}>
                  Ver todos
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {members.isPending ? (
              <MembersTableSkeleton />
            ) : members.isError ? (
              <p className="text-sm text-destructive">{members.error.message}</p>
            ) : (
              <MembersTable
                members={members.data.slice(0, MEMBERS_PREVIEW_LIMIT)}
                currentUserId={me.user.id}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
