import {
  type ActiveOrganization,
  type OrganizationSummary,
  PERMISSION_LABELS,
} from '@nexus/shared';
import { Check } from 'lucide-react';
import { RoleBadge } from '@/components/role-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/format';

export function OrganizationCard({
  summary,
  organization,
}: {
  summary: OrganizationSummary;
  organization: ActiveOrganization;
}) {
  const details = [
    { label: 'Identificador', value: <code className="font-mono text-xs">{summary.slug}</code> },
    { label: 'Criada em', value: formatDate(summary.createdAt) },
    { label: 'Membros ativos', value: summary.memberCount },
    { label: 'Seu perfil', value: <RoleBadge role={organization.role} /> },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{summary.name}</CardTitle>
        <CardDescription>Organização ativa nesta sessão</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
          {details.map((item) => (
            <div key={item.label} className="space-y-1">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
        <Separator />
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Suas permissões</p>
          <ul className="space-y-1.5 text-sm">
            {organization.permissions.map((permission) => (
              <li key={permission} className="flex items-center gap-2">
                <Check className="size-4 text-success" aria-hidden="true" />
                {PERMISSION_LABELS[permission]}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
