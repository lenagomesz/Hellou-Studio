// ─── Validation Error Types ──────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export type FieldValidator = (value: unknown) => ValidationError | null;

export type EditorValidationErrors = Record<string, string>;
export type EditorValidationWarnings = Record<string, string>;
