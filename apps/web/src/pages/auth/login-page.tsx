import { Link } from 'react-router';
import { AuthCardHeader } from '@/features/auth/components/auth-card-header';
import { LoginForm } from '@/features/auth/components/login-form';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { paths } from '@/lib/navigation';

export function LoginPage() {
  useDocumentTitle('Entrar');

  return (
    <>
      <AuthCardHeader
        title="Bem-vindo de volta"
        description="Entre com seu e-mail e senha para acessar o NEXUS CRM."
      />
      <LoginForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link
          to={paths.register}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Cadastre sua empresa
        </Link>
      </p>
    </>
  );
}
