import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { applyApiErrors } from '@/lib/form-errors';
import { paths } from '@/lib/navigation';
import { safeRedirect } from '@/lib/safe-redirect';
import { useLogin } from '../hooks';
import { loginSchema } from '../schemas';

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: (me) => {
        const target = me.activeOrganization
          ? safeRedirect(searchParams.get('redirect'))
          : paths.selectOrganization;
        void navigate(target, { replace: true });
      },
      onError: (error) => {
        form.resetField('password');
        setFormError(applyApiErrors(error, form.setError, ['email', 'password']));
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Entrar no NEXUS CRM">
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
        <div className="space-y-2">
          <FormTextField
            control={form.control}
            name="password"
            label="Senha"
            password
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              to={paths.forgotPassword}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Spinner />}
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </FieldGroup>
    </form>
  );
}
