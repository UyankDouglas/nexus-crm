import { type CustomerListItem, formatDocument, formatPhone } from '@nexus/shared';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermission } from '@/features/auth/hooks';
import { formatDateTime, formatRelative } from '@/lib/format';
import { customerPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { CustomerStatusBadge, CustomerTypeIcon, TagList } from './customer-badges';

interface CustomersTableProps {
  customers: CustomerListItem[];
  onEdit: (customer: CustomerListItem) => void;
  onDelete: (customer: CustomerListItem) => void;
  /** Esmaece a tabela enquanto a próxima página carrega. */
  isFetching?: boolean;
}

export function CustomersTable({ customers, onEdit, onDelete, isFetching }: CustomersTableProps) {
  const navigate = useNavigate();
  const canDelete = usePermission('customers:delete');

  return (
    <Table className={cn('transition-opacity', isFetching && 'opacity-60')}>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden md:table-cell">Contato</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Responsável</TableHead>
          <TableHead className="hidden xl:table-cell">Tags</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Atualizado</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow
            key={customer.id}
            className="cursor-pointer"
            onClick={(event) => {
              // Cliques em links, botões e menus da linha mantêm o próprio comportamento.
              if ((event.target as HTMLElement).closest('a, button, [role="menuitem"]')) return;
              void navigate(customerPath(customer.id));
            }}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <CustomerTypeIcon type={customer.type} />
                <div className="grid min-w-0">
                  <Link
                    to={customerPath(customer.id)}
                    className="truncate font-medium text-foreground hover:underline focus-visible:underline"
                  >
                    {customer.name}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">
                    {[
                      customer.tradeName,
                      customer.document && formatDocument(customer.document),
                      customer.company?.name,
                    ]
                      .filter(Boolean)
                      .join(' · ') || (customer.city ? `${customer.city}/${customer.state}` : '—')}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="grid text-sm">
                <span className="truncate">{customer.email ?? '—'}</span>
                <span className="text-xs text-muted-foreground">
                  {customer.phone ? formatPhone(customer.phone) : ''}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <CustomerStatusBadge status={customer.status} />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {customer.owner?.name ?? (
                <span className="text-muted-foreground italic">Sem responsável</span>
              )}
            </TableCell>
            <TableCell className="hidden xl:table-cell">
              <TagList tags={customer.tags} max={2} wrap={false} />
            </TableCell>
            <TableCell
              className="hidden text-right text-muted-foreground sm:table-cell"
              title={formatDateTime(customer.updatedAt)}
            >
              {formatRelative(customer.updatedAt)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${customer.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => void navigate(customerPath(customer.id))}>
                    <Eye />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(customer)}>
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(customer)}>
                        <Trash2 />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CustomersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4 py-2" role="status" aria-label="Carregando clientes">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-3.5 w-40 md:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="hidden h-3.5 w-24 lg:block" />
        </div>
      ))}
    </div>
  );
}
