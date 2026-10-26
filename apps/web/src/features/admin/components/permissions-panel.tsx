import {
  hasPermission,
  MEMBER_ROLES,
  type Permission,
  PERMISSION_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from '@nexus/shared';
import { Check, Minus } from 'lucide-react';
import { RoleBadge } from '@/components/role-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const GROUPS: Array<{ title: string; prefix: string }> = [
  { title: 'Organização e equipe', prefix: 'organization|members|audit' },
  { title: 'Clientes', prefix: 'customers' },
  { title: 'Negócios e funis', prefix: 'deals|pipelines' },
  { title: 'Tarefas e atividades', prefix: 'tasks|activities' },
  { title: 'Relatórios', prefix: 'reports' },
];

const ALL = Object.keys(PERMISSION_LABELS) as Permission[];

/** Observações de escopo exibidas para o vendedor, que só opera a própria carteira. */
const SALES_SCOPE: Partial<Record<Permission, string>> = {
  'customers:read': 'própria carteira',
  'customers:update': 'própria carteira',
  'deals:read': 'própria carteira',
  'deals:update': 'própria carteira',
  'tasks:read': 'sob sua responsabilidade',
  'tasks:create': 'para si',
  'tasks:update': 'sob sua responsabilidade',
  'activities:read': 'própria carteira',
};

/**
 * Matriz de permissões dos perfis — a mesma usada pela API para autorizar cada operação. Os
 * perfis são fixos nesta versão; o administrador escolhe o perfil de cada membro.
 */
export function PermissionsPanel() {
  return (
    <div className="space-y-6">
      <ul className="grid gap-4 md:grid-cols-3">
        {MEMBER_ROLES.map((role) => (
          <li key={role} className="space-y-2 rounded-lg border p-4">
            <RoleBadge role={role} />
            <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permissão</TableHead>
              {MEMBER_ROLES.map((role) => (
                <TableHead key={role} className="w-36 text-center">
                  {ROLE_LABELS[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {GROUPS.map((group) => {
            const permissions = ALL.filter((permission) =>
              new RegExp(`^(${group.prefix}):`).test(permission),
            );
            return (
              <TableBody key={group.title}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={4}
                    className="py-2 text-xs font-semibold text-muted-foreground uppercase"
                  >
                    {group.title}
                  </TableCell>
                </TableRow>
                {permissions.map((permission) => (
                  <TableRow key={permission}>
                    <TableCell className="text-sm">{PERMISSION_LABELS[permission]}</TableCell>
                    {MEMBER_ROLES.map((role) => {
                      const allowed = hasPermission(role, permission);
                      const scope =
                        role === 'SALES' && allowed ? SALES_SCOPE[permission] : undefined;
                      return (
                        <TableCell key={role} className="text-center">
                          {allowed ? (
                            <span className="inline-flex flex-col items-center text-success">
                              <Check className="size-4" aria-label="Permitido" />
                              {scope && (
                                <span className="text-[11px] text-muted-foreground">{scope}</span>
                              )}
                            </span>
                          ) : (
                            <Minus
                              className="mx-auto size-4 text-muted-foreground/50"
                              aria-label="Não permitido"
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            );
          })}
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        A interface apenas esconde o que o perfil não pode fazer: a API valida cada permissão e o
        acesso a cada registro em todas as requisições.
      </p>
    </div>
  );
}
