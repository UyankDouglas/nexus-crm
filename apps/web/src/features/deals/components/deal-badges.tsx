import { DEAL_STATUS_LABELS, type DealStatus } from '@nexus/shared';
import { CircleCheck, CircleX, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<DealStatus, string> = {
  OPEN: 'border-primary/25 bg-primary/10 text-primary',
  WON: 'border-success/30 bg-success/10 text-success',
  LOST: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const STATUS_ICONS = { OPEN: Loader, WON: CircleCheck, LOST: CircleX } as const;

export function DealStatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <Badge variant="outline" className={cn('gap-1', STATUS_STYLES[status], className)}>
      <Icon className="size-3" aria-hidden="true" />
      {DEAL_STATUS_LABELS[status]}
    </Badge>
  );
}
