import {
  MEMBER_ROLES,
  type MemberRole,
  type OrganizationMemberItem,
  ROLE_LABELS,
} from '@nexus/shared';
import { Lock, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import {
  MembersTable,
  MembersTableSkeleton,
} from '@/features/organization/components/members-table';
import { useOrganizationMembers } from '@/features/organization/hooks';
import { useUpdateMember } from '../hooks';

/**
 * Membros da organização. Administradores alteram perfis e suspendem ou reativam acessos —
 * exceto o próprio vínculo; a API garante ainda que sempre reste um administrador ativo.
 */
export function MembersPanel() {
  const me = useCurrentUser();
  const canRead = usePermission('members:read');
  const canManage = usePermission('members:manage');
  const members = useOrganizationMembers();
  const update = useUpdateMember();
  const [suspending, setSuspending] = useState<OrganizationMemberItem | null>(null);

  if (!canRead) {
    return (
      <Alert>
        <Lock />
        <AlertTitle>Acesso restrito</AlertTitle>
        <AlertDescription>
          A lista de membros está disponível para administradores e gestores comerciais.
        </AlertDescription>
      </Alert>
    );
  }
  if (members.isPending) return <MembersTableSkeleton />;
  if (members.isError) return <p className="text-sm text-destructive">{members.error.message}</p>;

  const change = (
    member: OrganizationMemberItem,
    input: { role?: MemberRole; status?: 'ACTIVE' | 'SUSPENDED' },
    success: string,
  ) =>
    update.mutate(
      { userId: member.userId, ...input },
      {
        onSuccess: () => {
          toast.success(success);
          setSuspending(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );

  const isSelf = (member: OrganizationMemberItem) => member.userId === me.user.id;

  return (
    <>
      <MembersTable
        members={members.data}
        currentUserId={me.user.id}
        renderRole={
          canManage
            ? (member) => (
                <Select
                  value={member.role}
                  disabled={isSelf(member) || update.isPending}
                  onValueChange={(role) =>
                    change(
                      member,
                      { role: role as MemberRole },
                      `${member.name} agora é ${ROLE_LABELS[role as MemberRole]}.`,
                    )
                  }
                >
                  <SelectTrigger
                    className="h-8 w-44"
                    aria-label={`Perfil de ${member.name}`}
                    title={isSelf(member) ? 'Você não pode alterar o próprio perfil.' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            : undefined
        }
        renderActions={
          canManage
            ? (member) =>
                isSelf(member) ? null : member.status === 'ACTIVE' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setSuspending(member)}
                  >
                    <UserX />
                    Suspender
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() =>
                      change(member, { status: 'ACTIVE' }, `Acesso de ${member.name} reativado.`)
                    }
                  >
                    <UserCheck />
                    Reativar
                  </Button>
                )
            : undefined
        }
      />

      <AlertDialog open={suspending !== null} onOpenChange={(open) => !open && setSuspending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <UserX />
            </AlertDialogMedia>
            <AlertDialogTitle>Suspender o acesso de {suspending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa perde o acesso à organização imediatamente, inclusive em sessões abertas.
              Clientes, negócios e tarefas continuam sob sua responsabilidade até serem
              redistribuídos. Você pode reativar o acesso quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={update.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (suspending) {
                  change(
                    suspending,
                    { status: 'SUSPENDED' },
                    `Acesso de ${suspending.name} suspenso.`,
                  );
                }
              }}
            >
              {update.isPending && <Spinner />}
              Suspender acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
