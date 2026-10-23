import { Link } from 'react-router';
import { AuthCardHeader } from '@/features/auth/components/auth-card-header';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { paths } from '@/lib/navigation';

export function RegisterPage() {
  useDocumentTitle('Cadastro');

  return (
    <>
      <AuthCardHeader
        title="Cadastre sua empresa"
        description="Crie a organização e a conta de administrador. Você poderá convidar a equipe depois."
      />
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link
          to={paths.login}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
