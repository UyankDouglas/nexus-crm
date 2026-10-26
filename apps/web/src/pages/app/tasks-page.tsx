import { ListChecks, MessagesSquare } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivitiesView } from '@/features/activities/components/activities-view';
import { usePermission } from '@/features/auth/hooks';
import { TasksView } from '@/features/tasks/components/tasks-view';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ACTIVITIES_TAB, TAB_PARAM } from '@/lib/navigation';

const TASKS_TAB = 'tarefas';

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get(TAB_PARAM) === ACTIVITIES_TAB ? ACTIVITIES_TAB : TASKS_TAB;
  const canViewAll = usePermission('tasks:read-all');
  useDocumentTitle(tab === ACTIVITIES_TAB ? 'Atividades' : 'Tarefas');

  // Trocar de aba limpa os filtros da aba anterior.
  const changeTab = (value: string) =>
    setSearchParams(value === ACTIVITIES_TAB ? { [TAB_PARAM]: ACTIVITIES_TAB } : {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas e atividades"
        description={
          canViewAll
            ? 'Prazos e interações de toda a equipe comercial.'
            : 'Suas tarefas e o histórico de interações com seus clientes.'
        }
      />

      <Tabs value={tab} onValueChange={changeTab} className="gap-6">
        <TabsList>
          <TabsTrigger value={TASKS_TAB}>
            <ListChecks />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value={ACTIVITIES_TAB}>
            <MessagesSquare />
            Atividades
          </TabsTrigger>
        </TabsList>
        <TabsContent value={TASKS_TAB}>
          <TasksView />
        </TabsContent>
        <TabsContent value={ACTIVITIES_TAB}>
          <ActivitiesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
