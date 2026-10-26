-- A trilha de auditoria continua somente de inclusão, com uma exceção: a anonimização do autor
-- feita pela própria chave estrangeira (ON DELETE SET NULL) quando um usuário é excluído. Sem
-- ela, a trigger bloquearia a exclusão de qualquer usuário com ações registradas. Todas as
-- demais colunas precisam permanecer idênticas.
CREATE OR REPLACE FUNCTION "audit_logs_prevent_update"() RETURNS trigger AS $$
BEGIN
  IF OLD."actor_id" IS NOT NULL AND NEW."actor_id" IS NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs é somente de inclusão';
END;
$$ LANGUAGE plpgsql;
