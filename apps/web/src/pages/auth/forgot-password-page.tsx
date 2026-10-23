import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { AuthCardHeader } from '@/features/auth/components/auth-card-header';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { paths } from '@/lib/navigation';

export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha');

  return (
    <>
      <AuthCardHeader
        title="Recuperar senha"
        description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      />
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm">
        <Link
          to={paths.login}
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
