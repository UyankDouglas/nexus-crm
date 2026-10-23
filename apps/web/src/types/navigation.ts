import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Breve descrição exibida na busca e nas páginas de módulo. */
  description: string;
  /** Módulo ainda não lançado: exibe o selo "Em breve" e a página de roadmap. */
  upcoming?: {
    phase: number;
    features: string[];
  };
}
