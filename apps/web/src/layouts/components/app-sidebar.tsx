import { NavLink, useLocation } from 'react-router';
import { Logo, LogoMark } from '@/components/brand/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { mainNavigation, systemNavigation } from '@/lib/navigation';
import type { NavigationItem } from '@/types/navigation';
import { OrganizationSwitcher } from './organization-switcher';

function NavigationGroup({ label, items }: { label: string; items: NavigationItem[] }) {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                >
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => isMobile && setOpenMobile(false)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
                {item.upcoming && (
                  <SidebarMenuBadge className="rounded-full bg-sidebar-accent px-1.5 text-[10px] font-medium text-sidebar-foreground/80">
                    Em breve
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-3 px-3 pt-4">
        <div className="flex h-8 items-center px-1">
          {state === 'collapsed' ? <LogoMark className="size-7" /> : <Logo inverted />}
        </div>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarSeparator className="mx-0" />
      <SidebarContent>
        <NavigationGroup label="Comercial" items={mainNavigation} />
        <NavigationGroup label="Sistema" items={systemNavigation} />
      </SidebarContent>
      <SidebarFooter className="px-4 pb-4 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-sidebar-foreground/50">NEXUS CRM · v0.1.0</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
