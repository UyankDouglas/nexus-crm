import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  type CustomerStatus,
  type CustomerType,
} from '@nexus/shared';
import { Building2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<CustomerStatus, string> = {
  LEAD: 'border-primary/25 bg-primary/10 text-primary',
  ACTIVE: 'border-success/30 bg-success/10 text-success',
  INACTIVE: 'border-border bg-muted text-muted-foreground',
};

export function CustomerStatusBadge({
  status,
  className,
}: {
  status: CustomerStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function CustomerTypeIcon({
  type,
  className,
  decorative = false,
}: {
  type: CustomerType;
  className?: string;
  /** Quando o tipo já aparece em texto ao lado, o ícone fica oculto para leitores de tela. */
  decorative?: boolean;
}) {
  const Icon = type === 'COMPANY' ? Building2 : UserRound;
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
        className,
      )}
      title={decorative ? undefined : CUSTOMER_TYPE_LABELS[type]}
      aria-hidden={decorative || undefined}
    >
      <Icon className="size-4" aria-hidden="true" />
      {!decorative && <span className="sr-only">{CUSTOMER_TYPE_LABELS[type]}</span>}
    </span>
  );
}

export function TagList({
  tags,
  max = tags.length,
  wrap = true,
}: {
  tags: string[];
  max?: number;
  wrap?: boolean;
}) {
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
  const visible = tags.slice(0, max);
  const hidden = tags.length - visible.length;

  return (
    <span className={cn('flex gap-1', wrap ? 'flex-wrap' : 'flex-nowrap')}>
      {visible.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          {tag}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge
          variant="outline"
          className="font-normal text-muted-foreground"
          title={tags.slice(max).join(', ')}
        >
          +{hidden}
        </Badge>
      )}
    </span>
  );
}
