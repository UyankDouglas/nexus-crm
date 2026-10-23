import { ArrowLeft, Link2Off } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { AuthCardHeader } from '@/features/auth/components/auth-card-header';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { paths } from '@/lib/navigation';

export function ResetPasswordPage() {
  useDocumentTitle('Redefinir senha');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Link2Off />
          </EmptyMedia>
          <EmptyTitle>Link inválido</EmptyTitle>
          <EmptyDescription>
            O link de redefinição está incompleto. Solicite um novo link para criar sua senha.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to={paths.forgotPassword}>Solicitar novo link</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <AuthCardHeader
        title="Criar nova senha"
        description="Defina uma nova senha. Por segurança, todas as sessões abertas serão encerradas."
      />
      <ResetPasswordForm token={token} />
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
