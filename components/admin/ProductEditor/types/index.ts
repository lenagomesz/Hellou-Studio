export type {
  EditorMode,
  DraftVariation,
  MercadoPagoFees,
  ProductEditorPermissions,
  VersionHistoryEntry,
  ProductEditorState,
} from './editor-state';

export { DEFAULT_PERMISSIONS, createInitialEditorState } from './editor-state';

export type {
  ValidationSeverity,
  ValidationError,
  ValidationResult,
  FieldValidator,
  EditorValidationErrors,
  EditorValidationWarnings,
} from './editor-validation';
