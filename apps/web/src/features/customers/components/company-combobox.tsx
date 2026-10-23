import type { CustomerSummary } from '@nexus/shared';
import { Building2, Check, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { useCustomers } from '../hooks';

interface CompanyComboboxProps {
  id?: string;
  value: CustomerSummary | null;
  onChange: (company: CustomerSummary | null) => void;
  invalid?: boolean;
}

/** Seleção da empresa vinculada a uma pessoa física, com busca no servidor. */
export function CompanyCombobox({ id, value, onChange, invalid }: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const companies = useCustomers({
    type: 'COMPANY',
    search: debounced || undefined,
    page: 1,
    pageSize: 8,
    sort: 'name',
  });

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className="h-9 flex-1 justify-between font-normal"
          >
            <span
              className={cn('flex items-center gap-2 truncate', !value && 'text-muted-foreground')}
            >
              <Building2 />
              {value?.name ?? 'Selecione uma empresa'}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar empresa…" />
            <CommandList>
              {companies.isFetching && !companies.data ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                  <CommandGroup>
                    {(companies.data?.data ?? []).map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.id}
                        onSelect={() => {
                          onChange({ id: company.id, name: company.name });
                          setOpen(false);
                        }}
                      >
                        <span className="flex-1 truncate">{company.name}</span>
                        {value?.id === company.id && <Check className="text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => onChange(null)}
          aria-label="Remover empresa vinculada"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
