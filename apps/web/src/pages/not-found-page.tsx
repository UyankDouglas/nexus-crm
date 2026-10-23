import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { paths } from '@/lib/navigation';

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada');

  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Compass />
        </EmptyMedia>
        <EmptyTitle>Página não encontrada</EmptyTitle>
        <EmptyDescription>O endereço acessado não existe ou foi movido.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={paths.dashboard}>Ir para o dashboard</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
