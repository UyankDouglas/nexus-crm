import { ACTIVITY_TYPE_LABELS, type ActivityType } from '@nexus/shared';
import { cn } from '@/lib/utils';
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_STYLES } from '../activity-types';

export function ActivityTypeIcon({ type, className }: { type: ActivityType; className?: string }) {
  const Icon = ACTIVITY_TYPE_ICONS[type];
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4',
        ACTIVITY_TYPE_STYLES[type],
        className,
      )}
      title={ACTIVITY_TYPE_LABELS[type]}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">{ACTIVITY_TYPE_LABELS[type]}</span>
    </span>
  );
}
