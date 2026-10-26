-- Regras de integridade de convites e auditoria que o schema do Prisma não expressa.

-- E-mail do convite sempre normalizado em minúsculas (o aceite compara com users.email).
ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_email_lowercase_check" CHECK ("email" = lower("email"));

-- Um convite termina aceito ou cancelado, nunca os dois.
ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_single_outcome_check"
  CHECK (NOT ("accepted_at" IS NOT NULL AND "revoked_at" IS NOT NULL));

-- No máximo um convite pendente por e-mail em cada organização.
CREATE UNIQUE INDEX "invitations_pending_email_key"
  ON "invitations" ("organization_id", "email")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;

-- A trilha de auditoria é somente de inclusão: registros não podem ser alterados.
CREATE FUNCTION "audit_logs_prevent_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é somente de inclusão';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_logs_no_update"
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_prevent_update"();
