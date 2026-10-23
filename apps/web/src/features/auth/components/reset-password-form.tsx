import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH } from '@nexus/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { applyApiErrors } from '@/lib/form-errors';
import { paths } from '@/lib/navigation';
import { isApiError } from '@/services/api-client';
import { useResetPassword } from '../hooks';
import { resetPasswordFormSchema } from '../schemas';

export function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const resetPassword = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const form = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(({ password }) => {
    setFormError(null);
    resetPassword.mutate(
      { token, password },
      {
        onSuccess: (response) => {
          toast.success(response.message);
          void navigate(paths.login, { replace: true });
        },
        onError: (error) => {
          setTokenInvalid(isApiError(error, 'INVALID_RESET_TOKEN'));
          setFormError(applyApiErrors(error, form.setError, ['password']));
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Redefinir senha">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        {tokenInvalid && (
          <Button asChild variant="outline" className="w-full">
            <Link to={paths.forgotPassword}>Solicitar um novo link</Link>
          </Button>
        )}
        <FormTextField
          control={form.control}
          name="password"
          label="Nova senha"
          password
          autoComplete="new-password"
          description={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`}
          autoFocus
        />
        <FormTextField
          control={form.control}
          name="confirmPassword"
          label="Confirme a nova senha"
          password
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
          {resetPassword.isPending && <Spinner />}
          Redefinir senha
        </Button>
      </FieldGroup>
    </form>
  );
}
