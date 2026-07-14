-- LEGADO: migracao manual de autenticacao em dois fatores.
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes TEXT[]; -- Array of hashed backup codes (never used codes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_last_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes_generated_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_2fa_enabled ON users(two_fa_enabled) WHERE two_fa_enabled = TRUE;

-- Create rate limiting table for 2FA attempts
CREATE TABLE IF NOT EXISTS two_fa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_at TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT two_fa_attempts_per_user UNIQUE(user_id, attempt_at)
);

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_two_fa_attempts_user_time ON two_fa_attempts(user_id, created_at DESC);
