import { PAGE_SIZES, type CustomerListItem } from '@nexus/shared';
import { Plus, SearchX, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DataPagination } from '@/components/data-pagination';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { usePermission } from '@/features/auth/hooks';
import {
  hasActiveFilters,
  parseCustomerFilters,
  serializeCustomerFilters,
} from '@/features/customers/customer-filters';
import {
  type CustomerFormMode,
  CustomerFormSheet,
} from '@/features/customers/components/customer-form-sheet';
import { CustomerStatsCards } from '@/features/customers/components/customer-stats-cards';
import {
  CustomersTable,
  CustomersTableSkeleton,
} from '@/features/customers/components/customers-table';
import { CustomersToolbar } from '@/features/customers/components/customers-toolbar';
import { DeleteCustomerDialog } from '@/features/customers/components/delete-customer-dialog';
import { useCustomers, useCustomerStats } from '@/features/customers/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { customerPath, NEW_CUSTOMER_PARAM } from '@/lib/navigation';
import type { CustomerListParams } from '@/services/customers.service';

export function CustomersPage() {
  useDocumentTitle('Clientes');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(
    () => parseCustomerFilters(new URLSearchParams(queryString)),
    [queryString],
  );
  const customers = useCustomers(filters);
  const stats = useCustomerStats();
  const canViewAll = usePermission('customers:read-all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CustomerListItem | null>(null);
  const [toolbarKey, setToolbarKey] = useState(0);
  const creating = searchParams.get(NEW_CUSTOMER_PARAM) === '1';
  const formMode: CustomerFormMode = creating
    ? { kind: 'create' }
    : editingId
      ? { kind: 'edit', customerId: editingId }
      : null;

  const applyFilters = (next: CustomerListParams, options?: { replace?: boolean }) =>
    setSearchParams(serializeCustomerFilters(next), { replace: options?.replace ?? true });

  const changeFilters = (change: Partial<CustomerListParams>) =>
    applyFilters({ ...filters, ...change, page: 1 });

  const resetFilters = () => {
    applyFilters({ page: 1, pageSize: filters.pageSize, sort: filters.sort });
    setToolbarKey((key) => key + 1);
  };

  const openCreate = () => {
    const next = serializeCustomerFilters(filters);
    next.set(NEW_CUSTOMER_PARAM, '1');
    setSearchParams(next);
  };

  const closeForm = () => {
    setEditingId(null);
    if (creating) setSearchParams(serializeCustomerFilters(filters), { replace: true });
  };

  const meta = customers.data?.meta;
  const rows = customers.data?.data ?? [];
  const filtered = hasActiveFilters(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={
          canViewAll
            ? 'Carteira de clientes de toda a equipe comercial.'
            : 'Os clientes pelos quais você é responsável.'
        }
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Novo cliente
          </Button>
        }
      />

      <CustomerStatsCards
        stats={stats.data}
        filters={filters}
        canViewAll={canViewAll}
        onFilter={changeFilters}
      />

      <Card>
        <CardContent className="space-y-4">
          <CustomersToolbar
            key={toolbarKey}
            filters={filters}
            onChange={changeFilters}
            onReset={resetFilters}
          />

          {customers.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar os clientes</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {customers.error.message}
                <Button size="sm" variant="outline" onClick={() => void customers.refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : !customers.data ? (
            <CustomersTableSkeleton />
          ) : rows.length === 0 ? (
            <Empty className="border border-dashed py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">{filtered ? <SearchX /> : <Users />}</EmptyMedia>
                <EmptyTitle>
                  {filtered
                    ? 'Nenhum cliente encontrado'
                    : meta && meta.total > 0
                      ? 'Esta página não existe'
                      : 'Nenhum cliente cadastrado ainda'}
                </EmptyTitle>
                <EmptyDescription>
                  {filtered
                    ? 'Ajuste a busca ou os filtros para ver outros resultados.'
                    : meta && meta.total > 0
                      ? 'Volte para a primeira página para ver os clientes.'
                      : 'Cadastre empresas e pessoas físicas para começar a organizar sua carteira.'}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {filtered ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Limpar filtros
                  </Button>
                ) : meta && meta.total > 0 ? (
                  <Button variant="outline" onClick={() => changeFilters({})}>
                    Ir para a primeira página
                  </Button>
                ) : (
                  <Button onClick={openCreate}>
                    <Plus />
                    Cadastrar primeiro cliente
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <CustomersTable
              customers={rows}
              isFetching={customers.isPlaceholderData}
              onEdit={(customer) => setEditingId(customer.id)}
              onDelete={setDeleting}
            />
          )}

          {meta && meta.total > 0 && (
            <DataPagination
              meta={meta}
              pageSizes={PAGE_SIZES}
              itemLabel={{ singular: 'cliente', plural: 'clientes' }}
              onPageChange={(page) => applyFilters({ ...filters, page }, { replace: false })}
              onPageSizeChange={(pageSize) => changeFilters({ pageSize })}
            />
          )}
        </CardContent>
      </Card>

      <CustomerFormSheet
        mode={formMode}
        onClose={closeForm}
        onCreated={(customer) => void navigate(customerPath(customer.id))}
      />
      <DeleteCustomerDialog customer={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
