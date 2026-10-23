import {
  CUSTOMER_TYPE_LABELS,
  type CustomerDetail,
  documentLabel,
  formatDocument,
  formatPhone,
} from '@nexus/shared';
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  Info,
  Pencil,
  RefreshCw,
  SearchX,
  Trash2,
  UserRound,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/features/auth/hooks';
import { ContactsCard } from '@/features/customers/components/contacts-card';
import {
  CustomerStatusBadge,
  CustomerTypeIcon,
  TagList,
} from '@/features/customers/components/customer-badges';
import {
  type CustomerFormMode,
  CustomerFormSheet,
} from '@/features/customers/components/customer-form-sheet';
import { DeleteCustomerDialog } from '@/features/customers/components/delete-customer-dialog';
import { useCustomer } from '@/features/customers/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatDate, formatDateTime } from '@/lib/format';
import { customerPath, paths } from '@/lib/navigation';
import { isApiError } from '@/services/api-client';

function BackLink() {
  return (
    <Link
      to={paths.customers}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Clientes
    </Link>
  );
}

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const customer = useCustomer(customerId);
  useDocumentTitle(customer.data?.name ?? 'Cliente');

  if (customer.isError) {
    const notFound = isApiError(customer.error) && customer.error.status === 404;
    return (
      <div className="space-y-6">
        <BackLink />
        {notFound ? (
          <Empty className="border border-dashed py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>Cliente não encontrado</EmptyTitle>
              <EmptyDescription>
                O cliente não existe, foi excluído ou não está na sua carteira.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link to={paths.customers}>Voltar para clientes</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o cliente</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {customer.error.message}
              <Button size="sm" variant="outline" onClick={() => void customer.refetch()}>
                <RefreshCw />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (!customer.data) return <CustomerDetailSkeleton />;
  return <CustomerDetailView customer={customer.data} />;
}

function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  const navigate = useNavigate();
  const canDelete = usePermission('customers:delete');
  const [formMode, setFormMode] = useState<CustomerFormMode>(null);
  const [deleting, setDeleting] = useState(false);
  const isCompany = customer.type === 'COMPANY';

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <CustomerTypeIcon
            type={customer.type}
            decorative
            className="size-12 rounded-xl [&_svg]:size-6"
          />
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CustomerStatusBadge status={customer.status} />
              <Badge variant="outline" className="font-normal">
                {CUSTOMER_TYPE_LABELS[customer.type]}
              </Badge>
              {customer.tradeName && <span>{customer.tradeName}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={() => setFormMode({ kind: 'edit', customerId: customer.id })}
          >
            <Pencil />
            Editar
          </Button>
          {canDelete && (
            <Button variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 />
              Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados do cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
                <DetailItem label={documentLabel(customer.type)}>
                  {customer.document ? (
                    <span className="font-mono">{formatDocument(customer.document)}</span>
                  ) : null}
                </DetailItem>
                <DetailItem label="Responsável">
                  {customer.owner?.name ?? (
                    <span className="text-muted-foreground italic">Sem responsável</span>
                  )}
                </DetailItem>
                <DetailItem label="E-mail">
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                      {customer.email}
                    </a>
                  )}
                </DetailItem>
                <DetailItem label="Telefone">
                  {customer.phone && (
                    <a href={`tel:+55${customer.phone}`} className="text-primary hover:underline">
                      {formatPhone(customer.phone)}
                    </a>
                  )}
                </DetailItem>
                {isCompany ? (
                  <DetailItem label="Site">
                    {customer.website && (
                      <a
                        href={customer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {customer.website}
                      </a>
                    )}
                  </DetailItem>
                ) : (
                  <DetailItem label="Empresa vinculada">
                    {customer.company && (
                      <Link
                        to={customerPath(customer.company.id)}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Building2 className="size-3.5" />
                        {customer.company.name}
                      </Link>
                    )}
                  </DetailItem>
                )}
                <DetailItem label="Localização">
                  {[customer.city, customer.state].filter(Boolean).join(' / ') || null}
                </DetailItem>
              </dl>
            </CardContent>
          </Card>

          <ContactsCard customerId={customer.id} contacts={customer.contacts} />

          {isCompany && customer.linkedPeople.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pessoas vinculadas</CardTitle>
                <CardDescription>Clientes pessoa física ligados a esta empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {customer.linkedPeople.map((person) => (
                    <li key={person.id}>
                      <Link
                        to={customerPath(person.id)}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary/40 hover:bg-accent/50"
                      >
                        <UserRound className="size-4 text-primary" />
                        {person.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tags e observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TagList tags={customer.tags} />
              {customer.notes ? (
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="relative space-y-4 border-l pl-5">
                <TimelineItem
                  icon={<RefreshCw className="size-3" />}
                  title="Última atualização"
                  date={customer.updatedAt}
                />
                <TimelineItem
                  icon={<CalendarPlus className="size-3" />}
                  title={
                    customer.createdBy
                      ? `Cadastrado por ${customer.createdBy.name}`
                      : 'Cliente cadastrado'
                  }
                  date={customer.createdAt}
                />
              </ol>
              <Alert>
                <Info />
                <AlertDescription>
                  O registro de chamadas, reuniões e observações chega na Fase 4 — Tarefas e
                  atividades.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomerFormSheet mode={formMode} onClose={() => setFormMode(null)} />
      <DeleteCustomerDialog
        customer={deleting ? customer : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => void navigate(paths.customers, { replace: true })}
      />
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {children ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function TimelineItem({ icon, title, date }: { icon: ReactNode; title: string; date: string }) {
  return (
    <li>
      <span className="absolute -left-2.5 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-card">
        {icon}
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground" title={formatDateTime(date)}>
        {formatDate(date)}
      </p>
    </li>
  );
}

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando cliente">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
