-- Privacy-First Encrypted Schema
-- Uses pgcrypto for field-level encryption

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table - minimal PII
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Encrypted email using pgcrypto
  email_encrypted BYTEA NOT NULL,
  -- Hash for lookups (one-way)
  email_hash VARCHAR(64) NOT NULL UNIQUE,
  -- Auth provider ID (Clerk/Keycloak/OIDC) - hashed
  auth_id_hash VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Optional: last login for inactive user cleanup
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Aliases table - encrypted
CREATE TABLE aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Encrypted alias parts
  local_part_encrypted BYTEA NOT NULL,
  domain_encrypted BYTEA NOT NULL,
  -- Hash for lookups
  alias_hash VARCHAR(64) NOT NULL UNIQUE,
  -- Encrypted recipient email
  recipient_encrypted BYTEA NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled')),
  -- Optional encrypted description
  description_encrypted BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP WITH TIME ZONE,
  -- Counters only (no content)
  email_count INTEGER DEFAULT 0
);

-- Email logs - MINIMAL metadata only, NO content
-- Auto-delete after retention period
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alias_id UUID NOT NULL REFERENCES aliases(id) ON DELETE CASCADE,
  -- Hashed sender (not full email) for privacy
  from_hash VARCHAR(64) NOT NULL,
  -- NO subject stored
  -- NO content stored
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'forwarded' CHECK (status IN ('forwarded', 'blocked', 'failed')),
  -- Only error messages if needed for debugging
  error_message TEXT,
  -- TTL: auto-delete after 30 days
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Encryption keys table (enterprise only)
-- Store encryption keys separately, rotatable
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_version INTEGER NOT NULL UNIQUE,
  -- Key encrypted with master key from environment
  encrypted_key BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_aliases_user_id ON aliases(user_id);
CREATE INDEX idx_aliases_hash ON aliases(alias_hash);
CREATE INDEX idx_aliases_status ON aliases(status);
CREATE INDEX idx_email_logs_alias_id ON email_logs(alias_id);
CREATE INDEX idx_email_logs_expires ON email_logs(expires_at);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aliases_updated_at
  BEFORE UPDATE ON aliases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-delete expired logs
CREATE OR REPLACE FUNCTION delete_expired_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM email_logs WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup daily (use pg_cron or external cron)
-- Example with pg_cron:
-- SELECT cron.schedule('delete-expired-logs', '0 0 * * *', 'SELECT delete_expired_logs()');

-- Helper functions for encryption/decryption
-- Note: Encryption key should come from environment variable

CREATE OR REPLACE FUNCTION encrypt_field(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_field(data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(data, key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION hash_field(data TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(digest(data, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert default encryption key (v1)
-- In production, this should be generated and stored securely
INSERT INTO encryption_keys (key_version, encrypted_key, is_active)
VALUES (1, pgp_sym_encrypt('CHANGE_ME_IN_PRODUCTION', 'master-key-from-env'), true);

-- Data retention policy
COMMENT ON TABLE email_logs IS 'Auto-deletes records after 30 days for privacy';
COMMENT ON TABLE users IS 'All PII fields are encrypted at rest';
COMMENT ON TABLE aliases IS 'All sensitive fields encrypted with field-level encryption';
