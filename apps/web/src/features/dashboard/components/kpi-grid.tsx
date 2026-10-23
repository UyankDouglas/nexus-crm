import {
  CircleDollarSign,
  CircleX,
  Handshake,
  type LucideIcon,
  Percent,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface KpiDefinition {
  label: string;
  icon: LucideIcon;
  /** Módulo que passará a alimentar o indicador com dados reais. */
  source: string;
}

const KPIS: KpiDefinition[] = [
  { label: 'Total de clientes', icon: Users, source: 'Clientes · Fase 2' },
  { label: 'Oportunidades abertas', icon: Handshake, source: 'Funil de vendas · Fase 3' },
  { label: 'Negociações ganhas', icon: Trophy, source: 'Funil de vendas · Fase 3' },
  { label: 'Negociações perdidas', icon: CircleX, source: 'Funil de vendas · Fase 3' },
  { label: 'Valor total do pipeline', icon: Wallet, source: 'Funil de vendas · Fase 3' },
  {
    label: 'Receita de negócios ganhos',
    icon: CircleDollarSign,
    source: 'Funil de vendas · Fase 3',
  },
  { label: 'Taxa de conversão', icon: Percent, source: 'Dashboard · Fase 4' },
];

/**
 * Grade definitiva dos indicadores comerciais. Enquanto os módulos de origem não existem,
 * cada card informa de onde virão os dados — nenhum número fictício é exibido.
 */
export function KpiGrid() {
  return (
    <section aria-labelledby="kpis-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kpis-title" className="text-sm font-semibold text-foreground">
          Indicadores comerciais
        </h2>
        <p className="text-xs text-muted-foreground">
          Calculados a partir dos dados reais da organização conforme os módulos forem lançados.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <li key={kpi.label}>
            <Card size="sm" className="h-full">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <kpi.icon className="size-4" />
                  </span>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-muted-foreground/60">
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Sem dados</span>
                </p>
                <Badge
                  variant="outline"
                  className="mt-auto w-fit font-normal text-muted-foreground"
                >
                  {kpi.source}
                </Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
