import type { ActivityType } from '@nexus/shared';
import { type LucideIcon, Mail, MessageSquareText, Phone, Users } from 'lucide-react';

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, LucideIcon> = {
  CALL: Phone,
  MEETING: Users,
  EMAIL: Mail,
  NOTE: MessageSquareText,
};

export const ACTIVITY_TYPE_STYLES: Record<ActivityType, string> = {
  CALL: 'bg-primary/10 text-primary',
  MEETING: 'bg-success/15 text-success',
  EMAIL: 'bg-chart-4/15 text-chart-4',
  NOTE: 'bg-warning/15 text-warning',
};
