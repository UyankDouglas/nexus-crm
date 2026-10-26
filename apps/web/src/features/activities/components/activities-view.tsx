import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  type ActivityItem,
  type ActivityType,
  PAGE_SIZES,
} from '@nexus/shared';
import { FilterX, MessagesSquare, Plus, Search, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DataPagination } from '@/components/data-pagination';
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermission } from '@/features/auth/hooks';
import { useOrganizationMembers } from '@/features/organization/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ACTIVITIES_TAB, NEW_ACTIVITY_PARAM, TAB_PARAM } from '@/lib/navigation';
import type { ActivityListParams } from '@/services/activities.service';
import {
  hasActivityFilters,
  parseActivityFilters,
  serializeActivityFilters,
} from '../activity-filters';
import { useActivities } from '../hooks';
import { type ActivityFormMode, ActivityFormDialog } from './activity-form-dialog';
import { ActivityTimeline, ActivityTimelineSkeleton } from './activity-timeline';
import { DeleteActivityDialog } from './delete-activity-dialog';

const ALL = 'all';

/** Histórico de interações de toda a carteira visível ao usuário, com filtros na URL. */
export function ActivitiesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(
    () => parseActivityFilters(new URLSearchParams(queryString)),
    [queryString],
  );
  const activities = useActivities(filters);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const [deleting, setDeleting] = useState<ActivityItem | null>(null);
  const [toolbarKey, setToolbarKey] = useState(0);
  const registering = searchParams.get(NEW_ACTIVITY_PARAM) === '1';
  const formMode: ActivityFormMode = registering
    ? { kind: 'create' }
    : editing
      ? { kind: 'edit', activity: editing }
      : null;

  /** A aba de atividades fica sempre na URL, junto com os filtros. */
  const withTab = (params: URLSearchParams) => {
    params.set(TAB_PARAM, ACTIVITIES_TAB);
    return params;
  };
  const applyFilters = (next: ActivityListParams, options?: { replace?: boolean }) =>
    setSearchParams(withTab(serializeActivityFilters(next)), {
      replace: options?.replace ?? true,
    });
  const changeFilters = (change: Partial<ActivityListParams>) =>
    applyFilters({ ...filters, ...change, page: 1 });
  const resetFilters = () => {
    applyFilters({ page: 1, pageSize: filters.pageSize });
    setToolbarKey((key) => key + 1);
  };
  const openRegister = () => {
    const next = withTab(serializeActivityFilters(filters));
    next.set(NEW_ACTIVITY_PARAM, '1');
    setSearchParams(next);
  };
  const closeForm = () => {
    setEditing(null);
    if (registering) {
      setSearchParams(withTab(serializeActivityFilters(filters)), { replace: true });
    }
  };

  const meta = activities.data?.meta;
  const rows = activities.data?.data ?? [];
  const filtered = hasActivityFilters(filters);

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ActivitiesToolbar
            key={toolbarKey}
            filters={filters}
            onChange={changeFilters}
            onReset={resetFilters}
          />
          <Button onClick={openRegister} className="shrink-0">
            <Plus />
            Registrar atividade
          </Button>
        </div>

        {activities.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar as atividades</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {activities.error.message}
              <Button size="sm" variant="outline" onClick={() => void activities.refetch()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : !activities.data ? (
          <ActivityTimelineSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <Empty className="border border-dashed py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">{filtered ? <SearchX /> : <MessagesSquare />}</EmptyMedia>
              <EmptyTitle>
                {filtered ? 'Nenhuma atividade encontrada' : 'Nenhuma interação registrada'}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? 'Ajuste a busca ou os filtros para ver outros registros.'
                  : 'Registre ligações, reuniões, e-mails e observações com seus clientes.'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {filtered ? (
                <Button variant="outline" onClick={resetFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <Button onClick={openRegister}>
                  <Plus />
                  Registrar primeira atividade
                </Button>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <ActivityTimeline
            activities={rows}
            onEdit={setEditing}
            onDelete={setDeleting}
            isFetching={activities.isPlaceholderData}
          />
        )}

        {meta && meta.total > 0 && (
          <DataPagination
            meta={meta}
            pageSizes={PAGE_SIZES}
            itemLabel={{ singular: 'atividade', plural: 'atividades' }}
            onPageChange={(page) => applyFilters({ ...filters, page }, { replace: false })}
            onPageSizeChange={(pageSize) => changeFilters({ pageSize })}
          />
        )}
      </CardContent>

      <ActivityFormDialog mode={formMode} onClose={closeForm} />
      <DeleteActivityDialog activity={deleting} onClose={() => setDeleting(null)} />
    </Card>
  );
}

function ActivitiesToolbar({
  filters,
  onChange,
  onReset,
}: {
  filters: ActivityListParams;
  onChange: (change: Partial<ActivityListParams>) => void;
  onReset: () => void;
}) {
  const canViewAll = usePermission('activities:read-all');
  const members = useOrganizationMembers();
  const [term, setTerm] = useState(filters.search ?? '');
  const debouncedTerm = useDebouncedValue(term.trim(), 350);

  useEffect(() => {
    if (debouncedTerm !== (filters.search ?? '')) onChange({ search: debouncedTerm || undefined });
    // Só a digitação dispara a busca; `filters` e `onChange` mudam a cada navegação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  const activeMembers = (members.data ?? []).filter((member) => member.status === 'ACTIVE');

  return (
    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <InputGroup className="h-9 sm:max-w-sm sm:flex-1">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar no assunto ou nos detalhes"
          aria-label="Buscar atividades"
          maxLength={100}
        />
      </InputGroup>
      <Select
        value={filters.type ?? ALL}
        onValueChange={(value) =>
          onChange({ type: value === ALL ? undefined : (value as ActivityType) })
        }
      >
        <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filtrar por tipo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os tipos</SelectItem>
          {ACTIVITY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canViewAll && (
        <Select
          value={filters.author ?? ALL}
          onValueChange={(value) => onChange({ author: value === ALL ? undefined : value })}
        >
          <SelectTrigger className="h-9 w-full sm:w-48" aria-label="Filtrar por autor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toda a equipe</SelectItem>
            <SelectItem value="me">Meus registros</SelectItem>
            {activeMembers.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Equipe</SelectLabel>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      )}
      {hasActivityFilters(filters) && (
        <Button variant="ghost" onClick={onReset}>
          <FilterX />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
