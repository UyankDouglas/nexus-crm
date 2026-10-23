import { Building2, LogOut, Moon, Search, Sun } from 'lucide-react';
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
import { useCurrentUser } from '@/features/auth/hooks';
import { useSignOut } from '@/features/auth/use-sign-out';
import { allNavigation, paths } from '@/lib/navigation';

/** Busca global (Ctrl/⌘ + K): navegação entre módulos e ações rápidas. */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const me = useCurrentUser();
  const { resolvedTheme, setTheme } = useTheme();
  const { signOut } = useSignOut();

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
        onOpenChange={setOpen}
        title="Buscar"
        description="Navegue pelos módulos ou execute uma ação."
      >
        <Command>
          <CommandInput placeholder="Digite um módulo ou ação…" />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            <CommandGroup heading="Módulos">
              {allNavigation.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`${item.title} ${item.description}`}
                  onSelect={() => run(() => void navigate(item.path))}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.upcoming && <CommandShortcut>Em breve</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ações">
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
