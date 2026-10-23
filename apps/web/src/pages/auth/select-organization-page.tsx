import { ROLE_LABELS } from '@nexus/shared';
import { Building2, ChevronRight, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { AuthCardHeader } from '@/features/auth/components/auth-card-header';
import { useCurrentUser, useSwitchOrganization } from '@/features/auth/hooks';
import { useSignOut } from '@/features/auth/use-sign-out';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { getFirstName, getInitials } from '@/lib/format';
import { paths } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function SelectOrganizationPage() {
  useDocumentTitle('Selecionar organização');
  const me = useCurrentUser();
  const navigate = useNavigate();
  const switchOrganization = useSwitchOrganization();
  const { signOut, isPending: signingOut } = useSignOut();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const select = (organizationId: string) => {
    setSelectedId(organizationId);
    switchOrganization.mutate(organizationId, {
      onSuccess: () => void navigate(paths.dashboard, { replace: true }),
      onError: (error) => toast.error(error.message),
    });
  };

  if (me.memberships.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>Nenhuma organização disponível</EmptyTitle>
          <EmptyDescription>
            Sua conta não possui vínculo ativo com nenhuma organização. Peça a um administrador para
            liberar seu acesso.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={signOut} disabled={signingOut}>
            <LogOut />
            Sair
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <AuthCardHeader
        title={`Olá, ${getFirstName(me.user.name)}`}
        description="Você participa de mais de uma organização. Escolha onde deseja trabalhar agora."
      />
      <ul className="space-y-3" aria-label="Organizações disponíveis">
        {me.memberships.map((membership) => {
          const isLoading =
            switchOrganization.isPending && selectedId === membership.organizationId;
          const isActive = me.activeOrganization?.id === membership.organizationId;
          return (
            <li key={membership.organizationId}>
              <button
                type="button"
                onClick={() => select(membership.organizationId)}
                disabled={switchOrganization.isPending}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors',
                  'hover:border-primary/50 hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  isActive && 'border-primary/40',
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(membership.organizationName)}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{membership.organizationName}</span>
                  <span className="text-sm text-muted-foreground">
                    {ROLE_LABELS[membership.role]}
                    {isActive && ' · organização atual'}
                  </span>
                </span>
                {isLoading ? (
                  <Spinner />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-8 flex justify-center">
        <Button variant="ghost" onClick={signOut} disabled={signingOut}>
          <LogOut />
          Entrar com outra conta
        </Button>
      </div>
    </>
  );
}
