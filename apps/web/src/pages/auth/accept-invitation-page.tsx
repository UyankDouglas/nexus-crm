import { zodResolver } from '@hookform/resolvers/zod';
import {
  type AcceptInvitationInput,
  acceptInvitationSchema,
  type InvitationPreview,
  PASSWORD_MIN_LENGTH,
  ROLE_LABELS,
} from '@nexus/shared';
import { CircleCheck, Link2Off, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useAcceptInvitation, useInvitationPreview } from '@/features/admin/hooks';
import { AuthCardHeader } from '@/features/auth/components/auth-card-header';
import { useMe, useSwitchOrganization } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { applyApiErrors } from '@/lib/form-errors';
import { paths } from '@/lib/navigation';

function InvalidInvitation({ message }: { message: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Link2Off />
        </EmptyMedia>
        <EmptyTitle>Convite indisponível</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to={paths.login}>Ir para o login</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function AcceptInvitationPage() {
  useDocumentTitle('Aceitar convite');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const preview = useInvitationPreview(token);

  if (!token) {
    return (
      <InvalidInvitation message="O link do convite está incompleto. Confira o e-mail recebido." />
    );
  }
  if (preview.isError) return <InvalidInvitation message={preview.error.message} />;
  if (!preview.data) {
    return (
      <div className="space-y-4" role="status" aria-label="Carregando convite">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const invitation = preview.data;
  return (
    <>
      <AuthCardHeader
        title={`Convite para ${invitation.organizationName}`}
        description={`${invitation.invitedBy ?? 'A administração'} convidou ${invitation.email} para participar como ${ROLE_LABELS[invitation.role]}.`}
      />
      {invitation.accountExists ? (
        <ExistingAccount token={token} invitation={invitation} />
      ) : (
        <NewAccountForm token={token} invitation={invitation} />
      )}
    </>
  );
}

/** Quem já tem conta só confirma; depois entra (ou troca de organização) com a própria senha. */
function ExistingAccount({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const navigate = useNavigate();
  const me = useMe();
  const accept = useAcceptInvitation();
  const switchOrganization = useSwitchOrganization();
  const [accepted, setAccepted] = useState<{ organizationId: string } | null>(null);
  const sameUser = me.data?.user.email === invitation.email;

  if (accepted) {
    return (
      <div className="space-y-4">
        <Alert className="border-success/30 text-success">
          <CircleCheck />
          <AlertDescription>
            Convite aceito! {invitation.organizationName} já aparece entre as suas organizações.
          </AlertDescription>
        </Alert>
        {sameUser ? (
          <Button
            className="w-full"
            disabled={switchOrganization.isPending}
            onClick={() =>
              switchOrganization.mutate(accepted.organizationId, {
                onSuccess: () => void navigate(paths.dashboard, { replace: true }),
              })
            }
          >
            {switchOrganization.isPending && <Spinner />}
            Acessar {invitation.organizationName}
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link to={paths.login}>
              <LogIn />
              Entrar com {invitation.email}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Já existe uma conta com este e-mail. Ao aceitar, a organização é adicionada à sua conta e
        você entra com a senha de sempre.
      </p>
      {me.data && !sameUser && (
        <Alert>
          <AlertDescription>
            Você está conectado como {me.data.user.email}. Depois de aceitar, entre com{' '}
            {invitation.email} para acessar a organização.
          </AlertDescription>
        </Alert>
      )}
      <FormErrorAlert message={accept.error?.message ?? null} />
      <Button
        className="w-full"
        disabled={accept.isPending}
        onClick={() =>
          accept.mutate(
            { token },
            { onSuccess: (result) => setAccepted({ organizationId: result.organizationId }) },
          )
        }
      >
        {accept.isPending && <Spinner />}
        Aceitar convite
      </Button>
    </div>
  );
}

/** Quem ainda não tem conta cria nome e senha; a sessão já começa na organização. */
function NewAccountForm({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const navigate = useNavigate();
  const accept = useAcceptInvitation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  const submit = form.handleSubmit(async ({ name, password }) => {
    setFormError(null);
    try {
      await accept.mutateAsync({ token, name, password });
      void navigate(paths.dashboard, { replace: true });
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, ['name', 'password']));
    }
  });

  return (
    <form onSubmit={submit} noValidate aria-label="Criar conta e aceitar o convite">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="name"
          label="Seu nome"
          autoComplete="name"
          autoFocus
        />
        <FormTextField
          control={form.control}
          name="password"
          label="Crie uma senha"
          password
          autoComplete="new-password"
          description={`Pelo menos ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`}
        />
        <FormTextField
          control={form.control}
          name="confirmPassword"
          label="Confirme a senha"
          password
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          A conta será criada com o e-mail {invitation.email}.
        </p>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Criar conta e entrar
        </Button>
      </FieldGroup>
    </form>
  );
}
