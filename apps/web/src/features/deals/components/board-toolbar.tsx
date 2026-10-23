import type { PipelineItem } from '@nexus/shared';
import { FilterX, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { type BoardFilters, hasBoardFilters } from '../board-filters';

const ALL = 'all';

interface BoardToolbarProps {
  filters: BoardFilters;
  pipelines: PipelineItem[];
  pipelineId: string;
  onChange: (change: Partial<BoardFilters>) => void;
  onReset: () => void;
}

export function BoardToolbar({
  filters,
  pipelines,
  pipelineId,
  onChange,
  onReset,
}: BoardToolbarProps) {
  const canViewAll = usePermission('deals:read-all');
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <InputGroup className="h-9 sm:w-80">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar por negócio ou cliente"
          aria-label="Buscar negócios"
          maxLength={100}
        />
      </InputGroup>

      {pipelines.length > 1 && (
        <Select value={pipelineId} onValueChange={(value) => onChange({ pipelineId: value })}>
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Funil">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {canViewAll && (
        <Select
          value={filters.owner ?? ALL}
          onValueChange={(value) => onChange({ owner: value === ALL ? undefined : value })}
        >
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Filtrar por responsável">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            <SelectItem value="me">Meus negócios</SelectItem>
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
          </SelectContent>
        </Select>
      )}

      {hasBoardFilters(filters) && (
        <Button variant="ghost" onClick={onReset}>
          <FilterX />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
