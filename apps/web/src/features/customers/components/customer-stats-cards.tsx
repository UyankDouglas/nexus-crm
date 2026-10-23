import type { CustomerStats, CustomerStatus } from '@nexus/shared';
import { CircleOff, Sparkles, UserCheck, UserX, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CustomerListParams } from '@/services/customers.service';

interface StatCard {
  label: string;
  value: number;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}

interface CustomerStatsCardsProps {
  stats: CustomerStats | undefined;
  filters: CustomerListParams;
  canViewAll: boolean;
  onFilter: (change: { status?: CustomerStatus; owner?: string }) => void;
}

/** Totais reais da carteira; cada card aplica o filtro correspondente na listagem. */
export function CustomerStatsCards({
  stats,
  filters,
  canViewAll,
  onFilter,
}: CustomerStatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[74px] rounded-xl" />
        ))}
      </div>
    );
  }

  const noStatusFilter = !filters.status && !filters.owner;
  const cards: StatCard[] = [
    {
      label: canViewAll ? 'Total de clientes' : 'Minha carteira',
      value: stats.total,
      icon: <Users />,
      active: noStatusFilter,
      onClick: () => onFilter({ status: undefined, owner: undefined }),
    },
    {
      label: 'Leads',
      value: stats.byStatus.LEAD,
      icon: <Sparkles />,
      active: filters.status === 'LEAD',
      onClick: () => onFilter({ status: 'LEAD', owner: undefined }),
    },
    {
      label: 'Ativos',
      value: stats.byStatus.ACTIVE,
      icon: <UserCheck />,
      active: filters.status === 'ACTIVE',
      onClick: () => onFilter({ status: 'ACTIVE', owner: undefined }),
    },
    canViewAll
      ? {
          label: 'Sem responsável',
          value: stats.unassigned,
          icon: <UserX />,
          active: filters.owner === 'none' && !filters.status,
          onClick: () => onFilter({ status: undefined, owner: 'none' }),
        }
      : {
          label: 'Inativos',
          value: stats.byStatus.INACTIVE,
          icon: <CircleOff />,
          active: filters.status === 'INACTIVE',
          onClick: () => onFilter({ status: 'INACTIVE', owner: undefined }),
        },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={card.onClick}
          aria-pressed={card.active}
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors',
            'hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            card.active && 'border-primary/50 bg-primary/5',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
            {card.icon}
          </span>
          <span className="grid">
            <span className="text-xl font-semibold tabular-nums">{card.value}</span>
            <span className="text-xs text-muted-foreground">{card.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
