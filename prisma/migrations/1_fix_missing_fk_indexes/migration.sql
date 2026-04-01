-- Migration: fix_missing_fk_indexes
-- Adiciona índices para FKs sem cobertura (reportado pelo Supabase Advisor)

-- callhistory.contactId → contact.id (sem índice → lento em JOINs)
CREATE INDEX IF NOT EXISTS "callhistory_contactId_idx" ON "callhistory"("contactId");

-- category.parentId → category.id (sem índice → lento em consultas hierárquicas)
CREATE INDEX IF NOT EXISTS "category_parentId_idx" ON "category"("parentId");
