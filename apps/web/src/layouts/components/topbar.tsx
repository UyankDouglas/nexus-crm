import { useLocation } from 'react-router';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { findNavigationItem } from '@/lib/navigation';
import { CommandMenu } from './command-menu';
import { NotificationsPopover } from './notifications-popover';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function Topbar() {
  const { pathname } = useLocation();
  const current = findNavigationItem(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-4">
      <SidebarTrigger aria-label="Recolher ou expandir menu lateral" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
      <span className="hidden text-sm font-medium text-foreground lg:inline">
        {current?.title ?? 'NEXUS CRM'}
      </span>
      <div className="flex flex-1 justify-center px-2 lg:px-6">
        <CommandMenu />
      </div>
      <div className="flex items-center gap-0.5">
        <ThemeToggle />
        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}
