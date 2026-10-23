import { Outlet } from 'react-router';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './components/app-sidebar';
import { Topbar } from './components/topbar';

/** Preferência visual (não sensível) persistida pelo componente Sidebar do shadcn/ui. */
function readSidebarPreference(): boolean {
  return !document.cookie.split('; ').includes('sidebar_state=false');
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={readSidebarPreference()}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <main id="conteudo" tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
