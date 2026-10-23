import { ROLE_LABELS } from '@nexus/shared';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUser, useSwitchOrganization } from '@/features/auth/hooks';
import { getInitials } from '@/lib/format';

export function OrganizationSwitcher() {
  const me = useCurrentUser();
  const { isMobile } = useSidebar();
  const switchOrganization = useSwitchOrganization();
  const active = me.activeOrganization;
  if (!active) return null;

  const handleSelect = (organizationId: string) => {
    if (organizationId === active.id) return;
    switchOrganization.mutate(organizationId, {
      onSuccess: (data) =>
        toast.success(`Organização alterada para ${data.activeOrganization?.name}.`),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label="Selecionar organização"
            >
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(active.name)}
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-sidebar-accent-foreground">
                  {active.name}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {ROLE_LABELS[active.role]}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto opacity-70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Suas organizações
            </DropdownMenuLabel>
            {me.memberships.map((membership) => (
              <DropdownMenuItem
                key={membership.organizationId}
                onSelect={() => handleSelect(membership.organizationId)}
                disabled={switchOrganization.isPending}
                className="gap-2.5"
              >
                <span className="flex size-7 items-center justify-center rounded-md border text-[11px] font-semibold">
                  {getInitials(membership.organizationName)}
                </span>
                <span className="grid flex-1 leading-tight">
                  <span className="truncate">{membership.organizationName}</span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[membership.role]}
                  </span>
                </span>
                {membership.organizationId === active.id && <Check className="text-primary" />}
              </DropdownMenuItem>
            ))}
            {me.memberships.length === 1 && (
              <>
                <DropdownMenuSeparator />
                <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" />
                  Você participa de uma organização.
                </p>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
