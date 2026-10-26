/** Linha da dica dos gráficos: indicador de cor, rótulo e valor alinhado à direita. */
export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      {color && <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />}
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}
