import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { applyApiErrors } from '@/lib/form-errors';
import { paths } from '@/lib/navigation';
import { useForgotPassword } from '../hooks';
import { forgotPasswordSchema } from '../schemas';

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    forgotPassword.mutate(values, {
      onSuccess: (response) => setSentMessage(response.message),
      onError: (error) => setFormError(applyApiErrors(error, form.setError, ['email'])),
    });
  });

  if (sentMessage) {
    return (
      <div className="space-y-6 rounded-xl border bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="size-6" />
        </span>
        <div className="space-y-2">
          <h2 className="font-semibold">Verifique seu e-mail</h2>
          <p className="text-sm text-muted-foreground">{sentMessage}</p>
          {import.meta.env.DEV && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Ambiente de desenvolvimento: o e-mail é gravado em{' '}
              <code className="font-mono">apps/api/.mail-outbox</code>.
            </p>
          )}
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to={paths.login}>Voltar para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Recuperar senha">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          autoFocus
        />
        <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
          {forgotPassword.isPending && <Spinner />}
          Enviar link de redefinição
        </Button>
      </FieldGroup>
    </form>
  );
}
