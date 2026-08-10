'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';

type ValidationStatus = 'valid' | 'warning' | 'error' | 'idle';

export function CollapsibleSection({
  title,
  description,
  icon: Icon,
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onOpenChange,
  validationStatus = 'idle',
  error,
  warning,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  validationStatus?: ValidationStatus;
  error?: string;
  warning?: string;
  children: ReactNode;
}) {
  const [isOpenLocal, setIsOpenLocal] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isOpenLocal;
  const setIsOpen = onOpenChange || setIsOpenLocal;

  const statusColors = {
    valid: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
    error: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
    idle: 'border-gray-200 dark:border-gray-700',
  };

  const statusIcons = {
    valid: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    idle: null,
  };

  return (
    <div className={`rounded-lg border transition ${statusColors[validationStatus]}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/50 dark:hover:bg-black/20 transition"
        type="button"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcons[validationStatus]}
          <ChevronDown
            className={`h-5 w-5 text-slate-600 dark:text-slate-400 transition transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {(error || warning) && (
            <div
              className={`rounded-md p-3 text-sm ${
                error
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              }`}
            >
              {error || warning}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
