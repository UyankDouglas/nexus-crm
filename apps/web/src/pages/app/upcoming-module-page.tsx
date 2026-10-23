import { Check, Construction } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useDocumentTitle } from '@/hooks/use-document-title';
import type { NavigationItem } from '@/types/navigation';

/**
 * Página de módulo em desenvolvimento. Mostra o escopo planejado sem simular
 * operações ou dados que ainda não existem na API.
 */
export function UpcomingModulePage({ item }: { item: NavigationItem }) {
  useDocumentTitle(item.title);
  const upcoming = item.upcoming;

  return (
    <div className="space-y-8">
      <PageHeader
        title={item.title}
        description={item.description}
        actions={upcoming && <Badge variant="secondary">Fase {upcoming.phase}</Badge>}
      />
      <Empty className="border border-dashed bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <item.icon />
          </EmptyMedia>
          <EmptyTitle className="flex items-center gap-2">
            <Construction className="size-4 text-warning" aria-hidden="true" />
            Módulo em desenvolvimento
          </EmptyTitle>
          <EmptyDescription>
            Este módulo será entregue na Fase {upcoming?.phase} do roadmap do NEXUS CRM. Veja o que
            está planejado:
          </EmptyDescription>
        </EmptyHeader>
        {upcoming && (
          <EmptyContent>
            <ul className="space-y-2 text-left text-sm">
              {upcoming.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </EmptyContent>
        )}
      </Empty>
    </div>
  );
}
