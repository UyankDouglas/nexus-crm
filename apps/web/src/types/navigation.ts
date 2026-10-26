import type { Permission } from '@nexus/shared';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Breve descrição exibida na busca global. */
  description: string;
  /** Permissão exigida para exibir o item (a API valida o acesso de qualquer forma). */
  permission?: Permission;
}
