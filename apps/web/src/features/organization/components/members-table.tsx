import type { OrganizationMemberItem } from '@nexus/shared';
import { RoleBadge } from '@/components/role-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, getInitials } from '@/lib/format';

export function MembersTable({
  members,
  currentUserId,
}: {
  members: OrganizationMemberItem[];
  currentUserId: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Membro</TableHead>
          <TableHead>Perfil</TableHead>
          <TableHead className="hidden md:table-cell">Situação</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Último acesso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.membershipId}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0">
                  <span className="truncate font-medium">
                    {member.name}
                    {member.userId === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <RoleBadge role={member.role} />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {member.status === 'ACTIVE' ? (
                <Badge variant="outline" className="border-success/30 text-success">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warning/40 text-warning">
                  Suspenso
                </Badge>
              )}
            </TableCell>
            <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
              {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Nunca acessou'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function MembersTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando membros">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
