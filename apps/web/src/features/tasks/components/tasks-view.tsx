import { PAGE_SIZES, type TaskItem } from '@nexus/shared';
import { ListChecks, Plus, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DataPagination } from '@/components/data-pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { usePermission } from '@/features/auth/hooks';
import { NEW_TASK_PARAM, TAB_PARAM } from '@/lib/navigation';
import type { TaskListParams } from '@/services/tasks.service';
import { useTasks, useTaskStats } from '../hooks';
import { hasTaskFilters, parseTaskFilters, serializeTaskFilters } from '../task-filters';
import { DeleteTaskDialog } from './delete-task-dialog';
import { type TaskFormMode, TaskFormSheet } from './task-form-sheet';
import { TaskList, TaskListSkeleton } from './task-list';
import { TaskStatsCards } from './task-stats-cards';
import { TasksToolbar } from './tasks-toolbar';

/** Lista de tarefas com filtros na URL, totais clicáveis e paginação. */
export function TasksView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = useMemo(() => parseTaskFilters(new URLSearchParams(queryString)), [queryString]);
  const tasks = useTasks(filters);
  const stats = useTaskStats();
  const canViewAll = usePermission('tasks:read-all');

  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [deleting, setDeleting] = useState<TaskItem | null>(null);
  const [toolbarKey, setToolbarKey] = useState(0);
  const creating = searchParams.get(NEW_TASK_PARAM) === '1';
  const formMode: TaskFormMode = creating
    ? { kind: 'create' }
    : editing
      ? { kind: 'edit', task: editing }
      : null;

  const applyFilters = (next: TaskListParams, options?: { replace?: boolean }) =>
    setSearchParams(serializeTaskFilters(next), { replace: options?.replace ?? true });
  const changeFilters = (change: Partial<TaskListParams>) =>
    applyFilters({ ...filters, ...change, page: 1 });
  const resetFilters = () => {
    applyFilters({ page: 1, pageSize: filters.pageSize, sort: filters.sort });
    setToolbarKey((key) => key + 1);
  };
  const openCreate = () => {
    const next = serializeTaskFilters(filters);
    next.set(NEW_TASK_PARAM, '1');
    setSearchParams(next);
  };
  const closeForm = () => {
    setEditing(null);
    if (creating) {
      const next = serializeTaskFilters(filters);
      if (searchParams.get(TAB_PARAM)) next.set(TAB_PARAM, searchParams.get(TAB_PARAM)!);
      setSearchParams(next, { replace: true });
    }
  };

  const meta = tasks.data?.meta;
  const rows = tasks.data?.data ?? [];
  const filtered = hasTaskFilters(filters);

  return (
    <div className="space-y-6">
      <TaskStatsCards stats={stats.data} filters={filters} onFilter={changeFilters} />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <TasksToolbar
                key={toolbarKey}
                filters={filters}
                onChange={changeFilters}
                onReset={resetFilters}
              />
            </div>
            <Button onClick={openCreate} className="shrink-0">
              <Plus />
              Nova tarefa
            </Button>
          </div>

          {tasks.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar as tarefas</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                {tasks.error.message}
                <Button size="sm" variant="outline" onClick={() => void tasks.refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : !tasks.data ? (
            <TaskListSkeleton />
          ) : rows.length === 0 ? (
            <Empty className="border border-dashed py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">{filtered ? <SearchX /> : <ListChecks />}</EmptyMedia>
                <EmptyTitle>
                  {filtered ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa pendente'}
                </EmptyTitle>
                <EmptyDescription>
                  {filtered
                    ? 'Ajuste a busca ou os filtros para ver outras tarefas.'
                    : 'Crie tarefas para organizar retornos, propostas e reuniões.'}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {filtered ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Button onClick={openCreate}>
                    <Plus />
                    Criar tarefa
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <TaskList
              tasks={rows}
              onEdit={setEditing}
              onDelete={setDeleting}
              showAssignee={canViewAll}
              isFetching={tasks.isPlaceholderData}
            />
          )}

          {meta && meta.total > 0 && (
            <DataPagination
              meta={meta}
              pageSizes={PAGE_SIZES}
              itemLabel={{ singular: 'tarefa', plural: 'tarefas' }}
              onPageChange={(page) => applyFilters({ ...filters, page }, { replace: false })}
              onPageSizeChange={(pageSize) => changeFilters({ pageSize })}
            />
          )}
        </CardContent>
      </Card>

      <TaskFormSheet mode={formMode} onClose={closeForm} />
      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
