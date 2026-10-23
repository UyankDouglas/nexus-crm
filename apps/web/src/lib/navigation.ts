import {
  ChartColumnBig,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react';
import type { NavigationItem } from '@/types/navigation';

export const paths = {
  login: '/entrar',
  register: '/cadastro',
  forgotPassword: '/recuperar-senha',
  resetPassword: '/redefinir-senha',
  selectOrganization: '/selecionar-organizacao',
  dashboard: '/',
  customers: '/clientes',
  pipeline: '/funil',
  tasks: '/tarefas',
  reports: '/relatorios',
  settings: '/configuracoes',
} as const;

/** Parâmetro de URL que abre o cadastro de cliente (usado pela busca global). */
export const NEW_CUSTOMER_PARAM = 'novo';

export function customerPath(id: string): string {
  return `${paths.customers}/${id}`;
}

/** Parâmetros de URL do funil: cadastro de negócio e negócio aberto na gaveta de detalhes. */
export const NEW_DEAL_PARAM = 'novo';
export const DEAL_PARAM = 'negocio';

export function dealPath(id: string): string {
  return `${paths.pipeline}?${DEAL_PARAM}=${id}`;
}

export const mainNavigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    path: paths.dashboard,
    icon: LayoutDashboard,
    description: 'Visão geral da organização e dos indicadores comerciais.',
  },
  {
    title: 'Clientes',
    path: paths.customers,
    icon: Users,
    description: 'Empresas e pessoas físicas, contatos, responsáveis e tags.',
  },
  {
    title: 'Funil de Vendas',
    path: paths.pipeline,
    icon: KanbanSquare,
    description: 'Kanban de oportunidades, do primeiro contato ao fechamento.',
  },
  {
    title: 'Tarefas',
    path: paths.tasks,
    icon: ListChecks,
    description: 'Tarefas, prazos e registro de atividades comerciais.',
    upcoming: {
      phase: 4,
      features: [
        'Tarefas com responsável, prazo e prioridade',
        'Registro de chamadas, reuniões e observações',
        'Vínculo com clientes e negócios',
      ],
    },
  },
  {
    title: 'Relatórios',
    path: paths.reports,
    icon: ChartColumnBig,
    description: 'Desempenho da equipe, conversão e receita.',
    upcoming: {
      phase: 5,
      features: [
        'Desempenho por vendedor e taxa de conversão',
        'Negócios ganhos e perdidos, receita por período',
        'Exportação em CSV e Excel',
      ],
    },
  },
];

export const systemNavigation: NavigationItem[] = [
  {
    title: 'Configurações',
    path: paths.settings,
    icon: Settings,
    description: 'Dados da organização, membros e perfis de acesso.',
  },
];

export const allNavigation = [...mainNavigation, ...systemNavigation];

export function findNavigationItem(pathname: string): NavigationItem | undefined {
  return allNavigation.find((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path),
  );
}
