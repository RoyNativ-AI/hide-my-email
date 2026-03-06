CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_part VARCHAR(64) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disabled')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP WITH TIME ZONE,
  email_count INTEGER DEFAULT 0,
  UNIQUE(local_part, domain)
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alias_id UUID NOT NULL REFERENCES aliases(id) ON DELETE CASCADE,
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  subject TEXT,
  forwarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'forwarded' CHECK (status IN ('forwarded', 'blocked', 'failed')),
  message_id VARCHAR(255),
  error_message TEXT
);

CREATE INDEX idx_aliases_user_id ON aliases(user_id);
CREATE INDEX idx_aliases_local_domain ON aliases(local_part, domain);
CREATE INDEX idx_aliases_status ON aliases(status);
CREATE INDEX idx_email_logs_alias_id ON email_logs(alias_id);
CREATE INDEX idx_email_logs_forwarded_at ON email_logs(forwarded_at);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aliases_updated_at BEFORE UPDATE ON aliases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();