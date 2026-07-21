BEGIN;
CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE users SET tenant_id = 'legacy-' || id::text WHERE tenant_id IS NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'auditor';
CREATE TABLE IF NOT EXISTS remediation_workflows(
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('verified','pending_review','approved','rejected','failed')),
 input JSONB NOT NULL, verification JSONB NOT NULL, failure_code TEXT, created_by TEXT NOT NULL,
 reviewed_by TEXT, review_reason TEXT, manual_review_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_remediation_workflow_tenant_status ON remediation_workflows(tenant_id,status);
CREATE TABLE IF NOT EXISTS remediation_workflow_audit(
 id BIGSERIAL PRIMARY KEY, workflow_id BIGINT NOT NULL REFERENCES remediation_workflows(id), tenant_id TEXT NOT NULL,
 actor_id TEXT NOT NULL, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMIT;
