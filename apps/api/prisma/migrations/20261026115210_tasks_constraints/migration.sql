-- Regras de integridade das tarefas que o schema do Prisma não expressa.

-- Data de conclusão presente somente enquanto a tarefa está concluída: reabrir a tarefa
-- (voltar para "a fazer" ou "em andamento") ou cancelá-la limpa a data.
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_completed_at_matches_status_check"
  CHECK (("status" = 'DONE') = ("completed_at" IS NOT NULL));
