-- AlterTable: add cpf_hash columns
ALTER TABLE "people" ADD COLUMN "cpf_hash" TEXT;
ALTER TABLE "application_candidates" ADD COLUMN "cpf_hash" TEXT;

-- Create indexes for CPF lookup and hot query paths
CREATE INDEX "people_cpf_hash_idx" ON "people"("cpf_hash");
CREATE INDEX "application_candidates_cpf_hash_idx" ON "application_candidates"("cpf_hash");

CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");
CREATE INDEX "applications_status_idx" ON "applications"("status");
CREATE INDEX "applications_submitted_at_idx" ON "applications"("submitted_at");

CREATE INDEX "documents_owner_user_id_idx" ON "documents"("owner_user_id");
CREATE INDEX "documents_application_id_idx" ON "documents"("application_id");

CREATE INDEX "members_status_idx" ON "members"("status");

CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX "payments_member_id_idx" ON "payments"("member_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_application_id_idx" ON "payments"("application_id");

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE INDEX "admin_notes_application_id_idx" ON "admin_notes"("application_id");
CREATE INDEX "admin_notes_member_id_idx" ON "admin_notes"("member_id");

CREATE INDEX "consents_user_id_consent_type_idx" ON "consents"("user_id", "consent_type");

CREATE INDEX "education_records_application_id_idx" ON "education_records"("application_id");

-- AlterTable: payments.amount Float -> Decimal(10,2)
-- Os valores existentes (Float) são convertidos sem perda prática para Decimal(10,2).
ALTER TABLE "payments" ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::DECIMAL(10,2);
