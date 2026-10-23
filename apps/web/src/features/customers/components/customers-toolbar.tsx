import {
  CUSTOMER_SORT_LABELS,
  CUSTOMER_SORTS,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPES,
  type CustomerSort,
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
import type { CustomerListParams } from '@/services/customers.service';
import { hasActiveFilters } from '../customer-filters';
import { useCustomerTags } from '../hooks';

const ALL = 'all';

type FilterChange = Partial<Omit<CustomerListParams, 'page' | 'pageSize'>>;

interface CustomersToolbarProps {
  filters: CustomerListParams;
  onChange: (change: FilterChange) => void;
  onReset: () => void;
}

function FilterSelect({
  label,
  value,
  onValueChange,
  children,
  className = 'w-full sm:w-40',
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

export function CustomersToolbar({ filters, onChange, onReset }: CustomersToolbarProps) {
  const canViewAll = usePermission('customers:read-all');
  const members = useOrganizationMembers();
  const tags = useCustomerTags();
  const [term, setTerm] = useState(filters.search ?? '');
  const debouncedTerm = useDebouncedValue(term.trim(), 350);

  useEffect(() => {
    if (debouncedTerm !== (filters.search ?? '')) onChange({ search: debouncedTerm || undefined });
    // `filters.search` e `onChange` mudam a cada navegação; só a digitação dispara a busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  const activeMembers = (members.data ?? []).filter((member) => member.status === 'ACTIVE');
  const fromSelect = (value: string) => (value === ALL ? undefined : value);

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
            placeholder="Buscar por nome, e-mail, telefone ou CPF/CNPJ"
            aria-label="Buscar clientes"
            maxLength={100}
          />
        </InputGroup>
        <FilterSelect
          label="Ordenar por"
          value={filters.sort}
          onValueChange={(value) => onChange({ sort: value as CustomerSort })}
          className="h-9 w-full sm:w-56"
        >
          {CUSTOMER_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {CUSTOMER_SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </FilterSelect>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <FilterSelect
          label="Filtrar por status"
          value={filters.status ?? ALL}
          onValueChange={(value) =>
            onChange({ status: fromSelect(value) as CustomerListParams['status'] })
          }
        >
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {CUSTOMER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {CUSTOMER_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Filtrar por tipo"
          value={filters.type ?? ALL}
          onValueChange={(value) =>
            onChange({ type: fromSelect(value) as CustomerListParams['type'] })
          }
        >
          <SelectItem value={ALL}>Todos os tipos</SelectItem>
          {CUSTOMER_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {CUSTOMER_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </FilterSelect>

        {canViewAll && (
          <FilterSelect
            label="Filtrar por responsável"
            value={filters.owner ?? ALL}
            onValueChange={(value) => onChange({ owner: fromSelect(value) })}
            className="w-full sm:w-48"
          >
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            <SelectItem value="me">Meus clientes</SelectItem>
            <SelectItem value="none">Sem responsável</SelectItem>
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

        <FilterSelect
          label="Filtrar por tag"
          value={filters.tag ?? ALL}
          onValueChange={(value) => onChange({ tag: fromSelect(value) })}
        >
          <SelectItem value={ALL}>Todas as tags</SelectItem>
          {filters.tag && !tags.data?.includes(filters.tag) && (
            <SelectItem value={filters.tag}>{filters.tag}</SelectItem>
          )}
          {(tags.data ?? []).map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </FilterSelect>

        {hasActiveFilters(filters) && (
          <Button variant="ghost" onClick={onReset} className="col-span-2 sm:col-span-1">
            <FilterX />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
