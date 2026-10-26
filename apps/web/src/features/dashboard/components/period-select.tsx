import { DASHBOARD_PERIOD_LABELS, DASHBOARD_PERIODS, type DashboardPeriod } from '@nexus/shared';
import { CalendarRange } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PeriodSelectProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  label: string;
}

/** Seletor dos períodos pré-definidos (últimos 7/30/90 dias, mês, ano…). */
export function PeriodSelect({ value, onChange, label }: PeriodSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as DashboardPeriod)}>
      <SelectTrigger className="w-44" aria-label={label}>
        <CalendarRange />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {DASHBOARD_PERIODS.map((item) => (
          <SelectItem key={item} value={item}>
            {DASHBOARD_PERIOD_LABELS[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
