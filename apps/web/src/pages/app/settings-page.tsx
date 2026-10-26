import type { Permission } from '@nexus/shared';
import {
  Building2,
  KanbanSquare,
  type LucideIcon,
  MailPlus,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditPanel } from '@/features/admin/components/audit-panel';
import { InvitationsPanel } from '@/features/admin/components/invitations-panel';
import { MembersPanel } from '@/features/admin/components/members-panel';
import { PermissionsPanel } from '@/features/admin/components/permissions-panel';
import { PipelinesPanel } from '@/features/admin/components/pipelines-panel';
import { useCanSee, usePermission } from '@/features/auth/hooks';
import { OrganizationSettingsForm } from '@/features/organization/components/organization-settings-form';
import { useOrganizationSummary } from '@/features/organization/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { TAB_PARAM } from '@/lib/navigation';

interface SettingsTab {
  value: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  permission?: Permission;
  content: ReactNode;
}

function OrganizationPanel() {
  const summary = useOrganizationSummary();
  const canEdit = usePermission('organization:update');
  if (summary.isPending) {
    return (
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (summary.isError) return <p className="text-sm text-destructive">{summary.error.message}</p>;
  return <OrganizationSettingsForm summary={summary.data} canEdit={canEdit} />;
}

const TABS: SettingsTab[] = [
  {
    value: 'organizacao',
    label: 'Organização',
    icon: Building2,
    title: 'Organização',
    description: 'Informações gerais da organização ativa.',
    content: <OrganizationPanel />,
  },
  {
    value: 'membros',
    label: 'Membros',
    icon: Users,
    title: 'Membros',
    description: 'Pessoas com acesso à organização, seus perfis e situação.',
    content: <MembersPanel />,
  },
  {
    value: 'convites',
    label: 'Convites',
    icon: MailPlus,
    title: 'Convites',
    description: 'Convide novas pessoas por e-mail e acompanhe os convites pendentes.',
    permission: 'members:manage',
    content: <InvitationsPanel />,
  },
  {
    value: 'funis',
    label: 'Funis',
    icon: KanbanSquare,
    title: 'Funis de vendas',
    description: 'Etapas, ordem e probabilidade de fechamento de cada funil.',
    permission: 'pipelines:manage',
    content: <PipelinesPanel />,
  },
  {
    value: 'permissoes',
    label: 'Permissões',
    icon: ShieldCheck,
    title: 'Perfis e permissões',
    description: 'O que cada perfil pode fazer. A API valida tudo em cada operação.',
    content: <PermissionsPanel />,
  },
  {
    value: 'auditoria',
    label: 'Auditoria',
    icon: ScrollText,
    title: 'Auditoria',
    description: 'Registro das ações importantes: quem fez, o quê e quando.',
    permission: 'audit:read',
    content: <AuditPanel />,
  },
];

export function SettingsPage() {
  useDocumentTitle('Configurações');
  const canSee = useCanSee();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = TABS.filter(canSee);
  const active = tabs.find((tab) => tab.value === searchParams.get(TAB_PARAM)) ?? tabs[0]!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Organização, equipe, funis de vendas, permissões e auditoria."
      />

      <Tabs
        value={active.value}
        onValueChange={(value) =>
          setSearchParams(value === tabs[0]!.value ? {} : { [TAB_PARAM]: value })
        }
        className="gap-6"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                <tab.icon />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.title}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>{tab.content}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
