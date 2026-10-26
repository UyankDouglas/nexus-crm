import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALLOW_WITHOUT_ORGANIZATION_KEY,
  AUTH_RATE_LIMIT_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './auth.decorators';

interface Route {
  route: string;
  isPublic: boolean;
  withoutOrganization: boolean;
  permissions: string[];
  rateLimited: boolean;
}

/** Lê todas as rotas declaradas nos controllers de `src/modules`, com seus metadados de acesso. */
function collectRoutes(): Route[] {
  const modulesDir = join(__dirname, '..', '..', 'modules');
  const files = readdirSync(modulesDir, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.controller.ts'),
  );
  const routes: Route[] = [];
  for (const file of files) {
    // Carregamento síncrono de cada controller encontrado no disco (lista dinâmica de arquivos).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const exports = require(join(modulesDir, file)) as Record<string, unknown>;
    for (const controller of Object.values(exports)) {
      if (typeof controller !== 'function') continue;
      const base = Reflect.getMetadata(PATH_METADATA, controller) as string | undefined;
      if (base === undefined) continue;
      const prototype = controller.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(prototype)) {
        const handler = prototype[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        if (path === undefined) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
        const read = (key: string): unknown =>
          Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller);
        routes.push({
          route: `${method} /${[base, path].filter((part) => part && part !== '/').join('/')}`,
          isPublic: read(IS_PUBLIC_KEY) === true,
          withoutOrganization: read(ALLOW_WITHOUT_ORGANIZATION_KEY) === true,
          permissions: (read(REQUIRED_PERMISSIONS_KEY) as string[] | undefined) ?? [],
          rateLimited: read(AUTH_RATE_LIMIT_KEY) === true,
        });
      }
    }
  }
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

/**
 * Revisão de segurança automatizada: toda rota nova precisa declarar como é protegida. Se este
 * teste falhar, decida conscientemente — permissão, rota pública (com rate limit) ou rota
 * autenticada sem organização — e atualize as listas abaixo.
 */
describe('Proteção das rotas da API', () => {
  const routes = collectRoutes();

  it('encontra as rotas dos controllers', () => {
    expect(routes.length).toBeGreaterThan(60);
  });

  it('toda rota exige permissão, salvo as públicas e as de sessão sem organização', () => {
    const unprotected = routes
      .filter((route) => !route.isPublic && !route.withoutOrganization)
      .filter((route) => route.permissions.length === 0)
      .map((route) => route.route);
    expect(unprotected).toEqual([]);
  });

  it('somente as rotas de autenticação, convite e saúde são públicas', () => {
    expect(routes.filter((route) => route.isPublic).map((route) => route.route)).toEqual([
      'GET /auth/csrf',
      'GET /health',
      'POST /auth/forgot-password',
      'POST /auth/login',
      'POST /auth/register',
      'POST /auth/reset-password',
      'POST /invitations/accept',
      'POST /invitations/preview',
    ]);
  });

  it('rotas públicas de escrita têm o limite restrito de requisições', () => {
    const missing = routes
      .filter((route) => route.isPublic && !route.route.startsWith('GET '))
      .filter((route) => !route.rateLimited)
      .map((route) => route.route);
    expect(missing).toEqual([]);
  });

  it('somente sessão, perfil e troca de organização dispensam a organização ativa', () => {
    expect(routes.filter((route) => route.withoutOrganization).map((route) => route.route)).toEqual(
      ['GET /auth/me', 'POST /auth/logout', 'POST /auth/switch-organization'],
    );
  });
});
