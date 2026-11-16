-- SOFT807 Assessment 3: upgrade an existing A1 SkyBridge database to the A3 schema.
-- Unlike SQL-Script-DDL.txt it keeps all data. It is safe to run more than once.
-- Afterwards run "node scripts/encrypt-existing.js" in backend/ to encrypt the existing values.

BEGIN;

ALTER TABLE users
    ALTER COLUMN phone TYPE TEXT,
    ADD COLUMN IF NOT EXISTS failed_logins INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until  TIMESTAMPTZ;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_failed_logins_check;
ALTER TABLE users ADD  CONSTRAINT users_failed_logins_check CHECK (failed_logins >= 0);

ALTER TABLE orders
    ALTER COLUMN company_name  TYPE TEXT,
    ALTER COLUMN contact_phone TYPE TEXT,
    ALTER COLUMN notes         TYPE TEXT;

CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    event      VARCHAR(40)  NOT NULL,
    user_id    INTEGER      REFERENCES users (id) ON DELETE SET NULL,
    email      VARCHAR(254),
    ip         VARCHAR(45),
    details    JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS audit_log_user_idx    ON audit_log (user_id);

COMMIT;
