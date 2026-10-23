import { MEMBER_ROLES, ROLE_DESCRIPTIONS } from '@nexus/shared';
import { Info, Lock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { RoleBadge } from '@/components/role-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import {
  MembersTable,
  MembersTableSkeleton,
} from '@/features/organization/components/members-table';
import { OrganizationSettingsForm } from '@/features/organization/components/organization-settings-form';
import { useOrganizationMembers, useOrganizationSummary } from '@/features/organization/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function SettingsPage() {
  useDocumentTitle('Configurações');
  const me = useCurrentUser();
  const summary = useOrganizationSummary();
  const members = useOrganizationMembers();
  const canEdit = usePermission('organization:update');
  const canReadMembers = usePermission('members:read');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Dados da organização, membros da equipe e perfis de acesso."
      />

      <Card>
        <CardHeader>
          <CardTitle>Organização</CardTitle>
          <CardDescription>Informações gerais da organização ativa.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.isPending ? (
            <div className="max-w-xl space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : summary.isError ? (
            <p className="text-sm text-destructive">{summary.error.message}</p>
          ) : (
            <OrganizationSettingsForm summary={summary.data} canEdit={canEdit} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>Pessoas com acesso à organização e seus perfis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canReadMembers ? (
            <>
              {members.isPending ? (
                <MembersTableSkeleton />
              ) : members.isError ? (
                <p className="text-sm text-destructive">{members.error.message}</p>
              ) : (
                <MembersTable members={members.data} currentUserId={me.user.id} />
              )}
              <Alert>
                <Info />
                <AlertTitle>Convites e gestão de permissões</AlertTitle>
                <AlertDescription>
                  O convite de novos membros e a alteração de perfis chegam na Fase 5 —
                  Administração.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert>
              <Lock />
              <AlertTitle>Acesso restrito</AlertTitle>
              <AlertDescription>
                A lista de membros está disponível para administradores e gestores comerciais.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfis de acesso</CardTitle>
          <CardDescription>
            As permissões são verificadas pela API em todas as operações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 md:grid-cols-3">
            {MEMBER_ROLES.map((role) => (
              <li key={role} className="space-y-2 rounded-lg border p-4">
                <RoleBadge role={role} />
                <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
