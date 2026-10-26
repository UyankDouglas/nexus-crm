import { zodResolver } from '@hookform/resolvers/zod';
import {
  INVITATION_TTL_DAYS,
  type InvitationInput,
  type InvitationItem,
  invitationSchema,
  MEMBER_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from '@nexus/shared';
import { MailPlus, MoreHorizontal, RefreshCw, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { RoleBadge } from '@/components/role-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { applyApiErrors } from '@/lib/form-errors';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useInvitations, useInvite, useResendInvitation, useRevokeInvitation } from '../hooks';

/** Convites pendentes, com envio, reenvio e cancelamento (somente administradores). */
export function InvitationsPanel() {
  const invitations = useInvitations();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const [inviting, setInviting] = useState(false);

  const act = (promise: Promise<unknown>, success: string) =>
    promise.then(
      () => toast.success(success),
      (error: Error) => toast.error(error.message),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          O convite chega por e-mail e vale por {INVITATION_TTL_DAYS} dias. Quem já tem conta apenas
          ganha acesso a esta organização.
        </p>
        <Button onClick={() => setInviting(true)}>
          <MailPlus />
          Convidar membro
        </Button>
      </div>

      {invitations.isError ? (
        <p className="text-sm text-destructive">{invitations.error.message}</p>
      ) : !invitations.data ? (
        <div className="space-y-2" role="status" aria-label="Carregando convites">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : invitations.data.length === 0 ? (
        <Empty className="border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Send />
            </EmptyMedia>
            <EmptyTitle>Nenhum convite pendente</EmptyTitle>
            <EmptyDescription>
              Convide vendedores, gestores e administradores por e-mail.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setInviting(true)}>
              <MailPlus />
              Convidar membro
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="hidden md:table-cell">Enviado por</TableHead>
              <TableHead className="hidden sm:table-cell">Validade</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.data.map((invitation: InvitationItem) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell>
                  <RoleBadge role={invitation.role} />
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {invitation.invitedBy?.name ?? '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {invitation.expired ? (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      Vencido
                    </Badge>
                  ) : (
                    <span
                      className="text-sm text-muted-foreground"
                      title={formatDateTime(invitation.expiresAt)}
                    >
                      vence {formatRelative(invitation.expiresAt)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ações do convite para ${invitation.email}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() =>
                          void act(
                            resend.mutateAsync(invitation.id),
                            `Convite reenviado para ${invitation.email}.`,
                          )
                        }
                      >
                        <RefreshCw />
                        Reenviar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          void act(
                            revoke.mutateAsync(invitation.id),
                            `Convite para ${invitation.email} cancelado.`,
                          )
                        }
                      >
                        <Trash2 />
                        Cancelar convite
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            Enviaremos um link de acesso para o e-mail informado.
          </DialogDescription>
        </DialogHeader>
        {open && <InviteForm onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const invite = useInvite();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<InvitationInput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '', role: 'SALES' },
  });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const invitation = await invite.mutateAsync(values);
      toast.success(`Convite enviado para ${invitation.email}.`);
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['email', 'role']));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          placeholder="nome@empresa.com"
          autoComplete="off"
          autoFocus
        />
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="field-role">Perfil</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="field-role" className="w-full">
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
              <FieldDescription>{ROLE_DESCRIPTIONS[field.value]}</FieldDescription>
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Enviar convite
        </Button>
      </DialogFooter>
    </form>
  );
}
