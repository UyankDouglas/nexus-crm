import { ROLE_LABELS } from '@nexus/shared';
import { Building2, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { type Theme, useTheme } from '@/app/theme-provider';
import { useNavigate } from 'react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/features/auth/hooks';
import { useSignOut } from '@/features/auth/use-sign-out';
import { getInitials } from '@/lib/format';
import { paths } from '@/lib/navigation';

export function UserMenu() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut, isPending } = useSignOut();
  const organization = me.activeOrganization;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-1.5 md:pr-2.5"
          aria-label={`Menu do usuário ${me.user.name}`}
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(me.user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm font-medium md:inline">
            {me.user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="grid gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{me.user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{me.user.email}</span>
          </div>
          {organization && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{organization.name}</span>
              <Badge variant="secondary" className="ml-auto shrink-0">
                {ROLE_LABELS[organization.role]}
              </Badge>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => void navigate(paths.settings)}>
            <Settings />
            Configurações
          </DropdownMenuItem>
          {me.memberships.length > 1 && (
            <DropdownMenuItem onSelect={() => void navigate(paths.selectOrganization)}>
              <Building2 />
              Trocar organização
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun />
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as Theme)}
              >
                <DropdownMenuRadioItem value="light">
                  <Sun />
                  Claro
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon />
                  Escuro
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor />
                  Sistema
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut} disabled={isPending}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
