export interface Setup2FAResponse {
  success: boolean;
  qrCode: string;
  secret: string;
  backupCodes: string[];
  message: string;
}

export interface Confirm2FARequest {
  secret: string;
  code: string;
  backupCodes: string[];
}

export interface Confirm2FAResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
  warning: string;
}

export interface Verify2FARequest {
  code: string;
}

export interface Verify2FAResponse {
  success: boolean;
  message: string;
  usingBackupCode: boolean;
  backupCodesRemaining: number;
}

export interface Disable2FARequest {
  code: string;
}

export interface Disable2FAResponse {
  success: boolean;
  message: string;
}

export interface RegenerateBackupCodesResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
  warning: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  attemptsRemaining: number;
  resetAt: Date;
}

export interface Two2FAttempt {
  id: string;
  user_id: string;
  attempt_at: string;
  ip_address?: string;
  success: boolean;
  created_at: string;
}

export interface UserWith2FA {
  id: string;
  two_fa_enabled: boolean;
  two_fa_secret?: string;
  two_fa_backup_codes?: string[];
  two_fa_last_verified_at?: string;
  two_fa_backup_codes_generated_at?: string;
}
