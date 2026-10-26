import type { DateRange, PipelineStageReport, ReportsOverview } from '@nexus/shared';
import { Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartCard } from '@/features/dashboard/components/charts/chart-card';
import { formatCurrency } from '@/lib/format';
import { ExportMenu } from './export-menu';

const numeric = 'text-right tabular-nums';

function groupByPipeline(stages: PipelineStageReport[]) {
  const groups: Array<{ id: string; name: string; stages: PipelineStageReport[] }> = [];
  for (const stage of stages) {
    const group = groups.find((item) => item.id === stage.pipelineId);
    if (group) group.stages.push(stage);
    else groups.push({ id: stage.pipelineId, name: stage.pipelineName, stages: [stage] });
  }
  return groups;
}

/** Valor em andamento por etapa e a previsão ponderada pela probabilidade de cada etapa. */
export function PipelineReport({
  overview,
  range,
}: {
  overview: ReportsOverview | undefined;
  range: DateRange;
}) {
  const groups = groupByPipeline(overview?.pipeline ?? []);
  const showPipeline = groups.length > 1;

  return (
    <ChartCard
      title="Valor do pipeline"
      description="Negócios em andamento por etapa · situação atual"
      action={<ExportMenu type="pipeline" range={range} />}
      loading={!overview}
      empty={overview?.totals.openCount === 0}
      emptyMessage="Nenhum negócio em andamento no momento."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Etapa</TableHead>
            <TableHead className={numeric}>Probabilidade</TableHead>
            <TableHead className={numeric}>Negócios</TableHead>
            <TableHead className={numeric}>Valor</TableHead>
            <TableHead className={numeric}>Valor ponderado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <Fragment key={group.id}>
              {showPipeline && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={5}
                    className="py-2 text-xs font-semibold text-muted-foreground uppercase"
                  >
                    {group.name}
                  </TableCell>
                </TableRow>
              )}
              {group.stages.map((stage) => (
                <TableRow key={stage.stageId}>
                  <TableCell className="font-medium">{stage.name}</TableCell>
                  <TableCell className={numeric}>{stage.probability}%</TableCell>
                  <TableCell className={numeric}>{stage.count}</TableCell>
                  <TableCell className={numeric}>{formatCurrency(stage.value)}</TableCell>
                  <TableCell className={numeric}>{formatCurrency(stage.weightedValue)}</TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
        {overview && (
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell />
              <TableCell className={numeric}>{overview.totals.openCount}</TableCell>
              <TableCell className={numeric}>{formatCurrency(overview.totals.openValue)}</TableCell>
              <TableCell className={numeric}>
                {formatCurrency(overview.totals.weightedValue)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </ChartCard>
  );
}
