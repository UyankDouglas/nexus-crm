import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MIN_LENGTH } from '@nexus/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup, FieldSeparator } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { applyApiErrors } from '@/lib/form-errors';
import { paths } from '@/lib/navigation';
import { useRegister } from '../hooks';
import { registerFormSchema } from '../schemas';

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      organizationName: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = form.handleSubmit(({ confirmPassword: _confirm, ...values }) => {
    setFormError(null);
    register.mutate(values, {
      onSuccess: (me) => {
        toast.success(`Organização ${me.activeOrganization?.name ?? ''} criada com sucesso!`);
        void navigate(paths.dashboard, { replace: true });
      },
      onError: (error) =>
        setFormError(
          applyApiErrors(error, form.setError, ['organizationName', 'name', 'email', 'password']),
        ),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Cadastrar organização">
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="organizationName"
          label="Nome da empresa"
          autoComplete="organization"
          placeholder="Ex.: Horizonte Tecnologia"
          autoFocus
        />
        <FieldSeparator>Administrador</FieldSeparator>
        <FormTextField
          control={form.control}
          name="name"
          label="Seu nome"
          autoComplete="name"
          placeholder="Nome e sobrenome"
        />
        <FormTextField
          control={form.control}
          name="email"
          label="E-mail corporativo"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
        />
        <FormTextField
          control={form.control}
          name="password"
          label="Senha"
          password
          autoComplete="new-password"
          description={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres, com letras e números.`}
        />
        <FormTextField
          control={form.control}
          name="confirmPassword"
          label="Confirme a senha"
          password
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={register.isPending}>
          {register.isPending && <Spinner />}
          {register.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </FieldGroup>
    </form>
  );
}
