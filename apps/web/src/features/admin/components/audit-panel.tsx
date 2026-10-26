import {
  AUDIT_ACTION_LABELS,
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_LABELS,
  type AuditCategory,
  type AuditLogItem,
  PAGE_SIZES,
} from '@nexus/shared';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganizationMembers } from '@/features/organization/hooks';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AuditListParams } from '@/services/admin.service';
import { useAuditLog } from '../hooks';

const ALL = 'all';
const CATEGORIES = Object.keys(AUDIT_CATEGORIES) as AuditCategory[];

const CATEGORY_STYLES: Record<AuditCategory, string> = {
  members: 'border-primary/30 text-primary',
  invitations: 'border-chart-4/30 text-chart-4',
  pipelines: 'border-warning/40 text-warning',
  records: 'border-destructive/30 text-destructive',
  exports: 'border-success/30 text-success',
  organization: 'border-border text-muted-foreground',
};

function categoryOf(action: AuditLogItem['action']): AuditCategory {
  return CATEGORIES.find((category) =>
    (AUDIT_CATEGORIES[category] as readonly string[]).includes(action),
  )!;
}

/** Trilha de auditoria (somente administradores), da ação mais recente para a mais antiga. */
export function AuditPanel() {
  const members = useOrganizationMembers();
  const [params, setParams] = useState<AuditListParams>({ page: 1, pageSize: 20 });
  const audit = useAuditLog(params);
  const change = (patch: Partial<AuditListParams>) =>
    setParams((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={params.category ?? ALL}
          onValueChange={(value) =>
            change({ category: value === ALL ? undefined : (value as AuditCategory) })
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Filtrar por tipo de ação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as ações</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {AUDIT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.actorId ?? ALL}
          onValueChange={(value) => change({ actorId: value === ALL ? undefined : value })}
        >
          <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Filtrar por pessoa">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as pessoas</SelectItem>
            {(members.data ?? []).map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {audit.isError ? (
        <p className="text-sm text-destructive">{audit.error.message}</p>
      ) : !audit.data ? (
        <div className="space-y-2" role="status" aria-label="Carregando auditoria">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : audit.data.data.length === 0 ? (
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>Nenhum registro</EmptyTitle>
            <EmptyDescription>
              Alterações de membros, convites, funis, exclusões e exportações aparecem aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className={cn(audit.isPlaceholderData && 'opacity-60')}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Quando</TableHead>
              <TableHead className="w-40">Quem</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.data.data.map((log) => {
              const category = categoryOf(log.action);
              return (
                <TableRow key={log.id}>
                  <TableCell className="align-top text-sm whitespace-nowrap text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {log.actor?.name ?? 'Sistema'}
                  </TableCell>
                  <TableCell className="space-y-1 whitespace-normal">
                    <Badge variant="outline" className={CATEGORY_STYLES[category]}>
                      {AUDIT_ACTION_LABELS[log.action]}
                    </Badge>
                    <p className="text-sm">{log.summary}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {audit.data && audit.data.meta.total > 0 && (
        <DataPagination
          meta={audit.data.meta}
          pageSizes={PAGE_SIZES}
          itemLabel={{ singular: 'registro', plural: 'registros' }}
          onPageChange={(page) => change({ page })}
          onPageSizeChange={(pageSize) => change({ pageSize })}
        />
      )}
    </div>
  );
}
