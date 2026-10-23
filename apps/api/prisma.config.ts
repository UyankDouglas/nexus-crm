import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // `env()` do Prisma lança erro quando a variável não existe, o que quebraria o
  // `prisma generate` em ambientes sem banco (ex.: build de CI). A URL só é
  // obrigatória para comandos de migração, que falham com mensagem clara sem ela.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
