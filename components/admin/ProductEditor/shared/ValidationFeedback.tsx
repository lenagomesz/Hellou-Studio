'use client';

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

export function ValidationFeedback({
  level = 'error',
  message,
  showIcon = true,
}: {
  level?: ValidationLevel;
  message?: string;
  showIcon?: boolean;
}) {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200',
    warning:
      'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200',
    success:
      'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200',
  };

  const icons = {
    error: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    info: <Info className="h-4 w-4 flex-shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
  };

  return (
    <div className={`rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${styles[level]}`}>
      {showIcon && icons[level]}
      <p>{message}</p>
    </div>
  );
}
