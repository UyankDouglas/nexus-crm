import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-8 shrink-0', className)}
      fill="none"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 23V9h2.6l7.8 9.6V9H22v14h-2.6l-7.8-9.6V23H9z" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span
        className={cn(
          'text-[15px] font-semibold tracking-tight',
          inverted ? 'text-white' : 'text-foreground',
        )}
      >
        NEXUS <span className={inverted ? 'text-blue-300' : 'text-primary'}>CRM</span>
      </span>
    </span>
  );
}
