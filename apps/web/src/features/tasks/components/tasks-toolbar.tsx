import {
  TASK_DUE_FILTER_LABELS,
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_SORT_LABELS,
  TASK_SORTS,
  TASK_STATUS_FILTER_LABELS,
  TASK_STATUS_FILTERS,
  type TaskSort,
  type TaskStatusFilter,
} from '@nexus/shared';
import { FilterX, Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import type { TaskListParams } from '@/services/tasks.service';
import { hasTaskFilters } from '../task-filters';

const ALL = 'all';

type FilterChange = Partial<Omit<TaskListParams, 'page' | 'pageSize'>>;

function FilterSelect({
  label,
  value,
  onValueChange,
  children,
  className = 'w-full sm:w-44',
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

interface TasksToolbarProps {
  filters: TaskListParams;
  onChange: (change: FilterChange) => void;
  onReset: () => void;
}

export function TasksToolbar({ filters, onChange, onReset }: TasksToolbarProps) {
  const canViewAll = usePermission('tasks:read-all');
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
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <InputGroup className="h-9 flex-1">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar pelo título da tarefa"
            aria-label="Buscar tarefas"
            maxLength={100}
          />
        </InputGroup>
        <FilterSelect
          label="Ordenar por"
          value={filters.sort}
          onValueChange={(value) => onChange({ sort: value as TaskSort })}
          className="h-9 w-full sm:w-52"
        >
          {TASK_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {TASK_SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </FilterSelect>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <FilterSelect
          label="Filtrar por status"
          value={filters.status ?? 'open'}
          onValueChange={(value) => onChange({ status: value as TaskStatusFilter })}
        >
          {TASK_STATUS_FILTERS.map((status) => (
            <SelectItem key={status} value={status}>
              {TASK_STATUS_FILTER_LABELS[status]}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Filtrar por prazo"
          value={filters.due ?? ALL}
          onValueChange={(value) =>
            onChange({ due: value === ALL ? undefined : (value as TaskListParams['due']) })
          }
        >
          <SelectItem value={ALL}>Qualquer prazo</SelectItem>
          {TASK_DUE_FILTERS.map((due) => (
            <SelectItem key={due} value={due}>
              {TASK_DUE_FILTER_LABELS[due]}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Filtrar por prioridade"
          className="w-full sm:w-48"
          value={filters.priority ?? ALL}
          onValueChange={(value) =>
            onChange({
              priority: value === ALL ? undefined : (value as TaskListParams['priority']),
            })
          }
        >
          <SelectItem value={ALL}>Todas as prioridades</SelectItem>
          {[...TASK_PRIORITIES].reverse().map((priority) => (
            <SelectItem key={priority} value={priority}>
              {TASK_PRIORITY_LABELS[priority]}
            </SelectItem>
          ))}
        </FilterSelect>

        {canViewAll && (
          <FilterSelect
            label="Filtrar por responsável"
            value={filters.assignee ?? ALL}
            onValueChange={(value) => onChange({ assignee: value === ALL ? undefined : value })}
            className="w-full sm:w-48"
          >
            <SelectItem value={ALL}>Toda a equipe</SelectItem>
            <SelectItem value="me">Minhas tarefas</SelectItem>
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
          </FilterSelect>
        )}

        {hasTaskFilters(filters) && (
          <Button variant="ghost" onClick={onReset} className="col-span-2 sm:col-span-1">
            <FilterX />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
