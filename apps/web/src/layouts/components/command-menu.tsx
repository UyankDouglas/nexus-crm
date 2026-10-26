import { formatDocument } from '@nexus/shared';
import {
  Building2,
  Handshake,
  ListPlus,
  LogOut,
  MessageSquarePlus,
  Moon,
  Plus,
  Search,
  Sun,
  UserRound,
} from 'lucide-react';
import { useTheme } from '@/app/theme-provider';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCanSee, useCurrentUser } from '@/features/auth/hooks';
import { useSignOut } from '@/features/auth/use-sign-out';
import { useCustomers } from '@/features/customers/hooks';
import { useDeals } from '@/features/deals/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency } from '@/lib/format';
import {
  ACTIVITIES_TAB,
  allNavigation,
  customerPath,
  dealPath,
  NEW_ACTIVITY_PARAM,
  NEW_CUSTOMER_PARAM,
  NEW_DEAL_PARAM,
  NEW_TASK_PARAM,
  paths,
  TAB_PARAM,
} from '@/lib/navigation';

const MIN_SEARCH_LENGTH = 2;

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Correspondência por trecho (sem acentos), mais previsível que a busca aproximada padrão. */
function matchCommand(value: string, search: string, keywords: string[] = []): number {
  const query = normalize(search.trim());
  if (!query) return 1;
  return normalize([value, ...keywords].join(' ')).includes(query) ? 1 : 0;
}

/** Busca global (Ctrl/⌘ + K): clientes, negócios, navegação entre módulos e ações rápidas. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const me = useCurrentUser();
  const canSee = useCanSee();
  const { resolvedTheme, setTheme } = useTheme();
  const { signOut } = useSignOut();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 250);
  const searching = open && term.length >= MIN_SEARCH_LENGTH;
  const customers = useCustomers(
    { search: term, page: 1, pageSize: 5, sort: 'name' },
    { enabled: searching },
  );
  const customerResults = searching ? (customers.data?.data ?? []) : [];
  const deals = useDeals(
    { search: term, page: 1, pageSize: 5, sort: 'recent' },
    { enabled: searching },
  );
  const dealResults = searching ? (deals.data?.data ?? []) : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    setSearch('');
    action();
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-sm justify-start gap-2 bg-background px-3 font-normal text-muted-foreground shadow-none sm:w-64 lg:w-80"
        aria-label="Abrir busca"
      >
        <Search />
        <span className="truncate">Buscar no NEXUS…</span>
        <kbd className="pointer-events-none ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-block">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
        title="Buscar"
        description="Busque clientes e negócios, navegue pelos módulos ou execute uma ação."
      >
        <Command filter={matchCommand}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar clientes, negócios, módulos ou ações…"
          />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            {customerResults.length > 0 && (
              <>
                <CommandGroup heading="Clientes">
                  {customerResults.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`cliente-${customer.id}`}
                      keywords={[search]}
                      onSelect={() => run(() => void navigate(customerPath(customer.id)))}
                    >
                      {customer.type === 'COMPANY' ? <Building2 /> : <UserRound />}
                      <span className="truncate">{customer.name}</span>
                      <CommandShortcut className="tracking-normal">
                        {customer.document ? formatDocument(customer.document) : customer.city}
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {dealResults.length > 0 && (
              <>
                <CommandGroup heading="Negócios">
                  {dealResults.map((deal) => (
                    <CommandItem
                      key={deal.id}
                      value={`negocio-${deal.id}`}
                      keywords={[search]}
                      onSelect={() => run(() => void navigate(dealPath(deal.id)))}
                    >
                      <Handshake />
                      <span className="truncate">{deal.title}</span>
                      <CommandShortcut className="tracking-normal whitespace-nowrap">
                        {deal.stageName} · {formatCurrency(deal.value)}
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Módulos">
              {allNavigation.filter(canSee).map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.title} ${item.description}`}
                  onSelect={() => run(() => void navigate(item.path))}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ações">
              <CommandItem
                value="novo cliente cadastrar"
                onSelect={() =>
                  run(() => void navigate(`${paths.customers}?${NEW_CUSTOMER_PARAM}=1`))
                }
              >
                <Plus />
                <span>Novo cliente</span>
              </CommandItem>
              <CommandItem
                value="novo negócio oportunidade cadastrar"
                onSelect={() => run(() => void navigate(`${paths.pipeline}?${NEW_DEAL_PARAM}=1`))}
              >
                <Plus />
                <span>Novo negócio</span>
              </CommandItem>
              <CommandItem
                value="nova tarefa prazo"
                onSelect={() => run(() => void navigate(`${paths.tasks}?${NEW_TASK_PARAM}=1`))}
              >
                <ListPlus />
                <span>Nova tarefa</span>
              </CommandItem>
              <CommandItem
                value="registrar atividade ligação reunião e-mail observação"
                onSelect={() =>
                  run(
                    () =>
                      void navigate(
                        `${paths.tasks}?${TAB_PARAM}=${ACTIVITIES_TAB}&${NEW_ACTIVITY_PARAM}=1`,
                      ),
                  )
                }
              >
                <MessageSquarePlus />
                <span>Registrar atividade</span>
              </CommandItem>
              <CommandItem
                value="alternar tema claro escuro"
                onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
              >
                {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
                <span>Alternar para tema {resolvedTheme === 'dark' ? 'claro' : 'escuro'}</span>
              </CommandItem>
              {me.memberships.length > 1 && (
                <CommandItem
                  value="trocar organização"
                  onSelect={() => run(() => void navigate(paths.selectOrganization))}
                >
                  <Building2 />
                  <span>Trocar organização</span>
                </CommandItem>
              )}
              <CommandItem value="sair encerrar sessão" onSelect={() => run(signOut)}>
                <LogOut />
                <span>Sair</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
