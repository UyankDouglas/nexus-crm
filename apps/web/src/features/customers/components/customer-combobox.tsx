import type { CustomerSummary, CustomerType } from '@nexus/shared';
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

interface CustomerComboboxProps {
  id?: string;
  value: CustomerSummary | null;
  onChange: (customer: CustomerSummary | null) => void;
  invalid?: boolean;
  /** Restringe a busca a empresas ou pessoas físicas. */
  type?: CustomerType;
  placeholder?: string;
  /** Permite limpar a seleção (campos opcionais). */
  clearable?: boolean;
}

/** Seleção de cliente com busca no servidor (respeita a carteira do usuário). */
export function CustomerCombobox({
  id,
  value,
  onChange,
  invalid,
  type,
  placeholder = 'Selecione um cliente',
  clearable = true,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const customers = useCustomers({
    type,
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
              {value?.name ?? placeholder}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar pelo nome…"
            />
            <CommandList>
              {customers.isFetching && !customers.data ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {(customers.data?.data ?? []).map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => {
                          onChange({ id: customer.id, name: customer.name });
                          setOpen(false);
                        }}
                      >
                        <span className="flex-1 truncate">{customer.name}</span>
                        {value?.id === customer.id && <Check className="text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && clearable && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => onChange(null)}
          aria-label="Limpar seleção"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
