-- Regras de integridade dos negócios que o schema do Prisma não expressa.

-- Valor potencial nunca negativo.
ALTER TABLE "deals" ADD CONSTRAINT "deals_value_non_negative_check" CHECK ("value" >= 0);

-- Status coerente com o fechamento: só negócios encerrados têm data de fechamento, e só os
-- perdidos têm motivo de perda (obrigatório nesse caso).
ALTER TABLE "deals"
  ADD CONSTRAINT "deals_closed_at_matches_status_check"
  CHECK (("status" = 'OPEN') = ("closed_at" IS NULL));

ALTER TABLE "deals"
  ADD CONSTRAINT "deals_lost_reason_matches_status_check"
  CHECK (("status" = 'LOST') = ("lost_reason" IS NOT NULL));

ALTER TABLE "pipeline_stages"
  ADD CONSTRAINT "pipeline_stages_probability_range_check" CHECK ("probability" BETWEEN 0 AND 100);

ALTER TABLE "pipeline_stages"
  ADD CONSTRAINT "pipeline_stages_position_non_negative_check" CHECK ("position" >= 0);

-- Funil padrão para as organizações criadas antes desta versão (as novas recebem o funil no
-- cadastro). Mesmas etapas de DEFAULT_PIPELINE_STAGES em packages/shared/src/deals.ts.
WITH new_pipelines AS (
  INSERT INTO "pipelines" ("id", "organization_id", "name", "is_default", "updated_at")
  SELECT gen_random_uuid(), o."id", 'Funil de vendas', true, CURRENT_TIMESTAMP
  FROM "organizations" o
  WHERE NOT EXISTS (SELECT 1 FROM "pipelines" p WHERE p."organization_id" = o."id")
  RETURNING "id", "organization_id"
)
INSERT INTO "pipeline_stages"
  ("id", "organization_id", "pipeline_id", "name", "kind", "probability", "position", "updated_at")
SELECT gen_random_uuid(), np."organization_id", np."id", s."name", s."kind"::"stage_kind",
       s."probability", s."position", CURRENT_TIMESTAMP
FROM new_pipelines np
CROSS JOIN (
  VALUES
    ('Novo lead', 'OPEN', 10, 0),
    ('Primeiro contato', 'OPEN', 20, 1),
    ('Qualificação', 'OPEN', 40, 2),
    ('Proposta enviada', 'OPEN', 60, 3),
    ('Negociação', 'OPEN', 80, 4),
    ('Ganho', 'WON', 100, 5),
    ('Perdido', 'LOST', 0, 6)
) AS s("name", "kind", "probability", "position");
