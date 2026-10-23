-- Regras de integridade que o schema do Prisma não expressa. Elas reforçam, no banco,
-- as mesmas validações feitas pela API.

-- Somente pessoas físicas podem ser vinculadas a uma empresa, e nunca a si mesmas.
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_company_only_for_person_check"
  CHECK ("company_id" IS NULL OR ("type" = 'PERSON' AND "company_id" <> "id"));

-- Documento sem pontuação: CPF com 11 dígitos ou CNPJ com 14 caracteres (alfanumérico).
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_document_format_check"
  CHECK (
    "document" IS NULL
    OR ("type" = 'PERSON' AND "document" ~ '^[0-9]{11}$')
    OR ("type" = 'COMPANY' AND "document" ~ '^[0-9A-Z]{12}[0-9]{2}$')
  );

-- UF com duas letras maiúsculas; telefone somente com dígitos.
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_state_format_check" CHECK ("state" IS NULL OR "state" ~ '^[A-Z]{2}$');

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_phone_format_check" CHECK ("phone" IS NULL OR "phone" ~ '^[0-9]{10,15}$');

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_phone_format_check" CHECK ("phone" IS NULL OR "phone" ~ '^[0-9]{10,15}$');
