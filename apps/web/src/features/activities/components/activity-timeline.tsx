import type { ActivityItem } from '@nexus/shared';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import { formatDateTime, formatRelative } from '@/lib/format';
import { customerPath, dealPath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { ActivityTypeIcon } from './activity-type';

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onEdit: (activity: ActivityItem) => void;
  onDelete: (activity: ActivityItem) => void;
  /** Oculta cliente e negócio quando a lista já está dentro de um deles. */
  hideLinks?: boolean;
  isFetching?: boolean;
}

/** Linha do tempo de interações. Só o autor edita; o autor ou a gestão excluem. */
export function ActivityTimeline({
  activities,
  onEdit,
  onDelete,
  hideLinks = false,
  isFetching = false,
}: ActivityTimelineProps) {
  const me = useCurrentUser();
  const canModerate = usePermission('activities:delete');

  return (
    <ol className={cn('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
      {activities.map((activity) => {
        const isAuthor = activity.author.id === me.user.id;
        const canDelete = isAuthor || canModerate;
        return (
          <li key={activity.id} className="flex gap-3">
            <ActivityTypeIcon type={activity.type} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{activity.subject}</p>
                {(isAuthor || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="-mt-0.5"
                        aria-label={`Ações para ${activity.subject}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAuthor && (
                        <DropdownMenuItem onSelect={() => onEdit(activity)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(activity)}>
                          <Trash2 />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {activity.description && (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {activity.description}
                </p>
              )}
              <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <time dateTime={activity.occurredAt} title={formatDateTime(activity.occurredAt)}>
                  {formatRelative(activity.occurredAt)}
                </time>
                <span>· {activity.author.name}</span>
                {!hideLinks && (
                  <>
                    <span>
                      ·{' '}
                      <Link
                        to={customerPath(activity.customer.id)}
                        className="hover:text-primary hover:underline"
                      >
                        {activity.customer.name}
                      </Link>
                    </span>
                    {activity.deal && (
                      <span>
                        ·{' '}
                        <Link
                          to={dealPath(activity.deal.id)}
                          className="hover:text-primary hover:underline"
                        >
                          {activity.deal.title}
                        </Link>
                      </span>
                    )}
                  </>
                )}
                {hideLinks && activity.deal && <span>· {activity.deal.title}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityTimelineSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando atividades">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
