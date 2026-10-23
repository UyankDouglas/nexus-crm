import { type MemberRole, ROLE_LABELS } from '@nexus/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ROLE_STYLES: Record<MemberRole, string> = {
  ADMIN: 'border-primary/20 bg-primary/10 text-primary',
  MANAGER: 'border-success/25 bg-success/10 text-success',
  SALES: 'border-border bg-secondary text-secondary-foreground',
};

export function RoleBadge({ role, className }: { role: MemberRole; className?: string }) {
  return (
    <Badge variant="outline" className={cn(ROLE_STYLES[role], className)}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
