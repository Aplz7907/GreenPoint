'use client';

import { AlertIcon } from '@/components/Icons';

export function Spinner() {
  return <span className="spinner" aria-hidden />;
}

export function AuthError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="field-label">
      {children}
    </label>
  );
}

export const inputClass = 'input';

/** Typing a password one-handed, outdoors, in sunlight, is miserable without this. */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  visible,
  onToggleVisible,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete: string;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input pr-16"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute bottom-1.5 right-1.5 top-1.5 rounded-[0.5rem] px-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        {visible ? 'ซ่อน' : 'แสดง'}
      </button>
    </div>
  );
}
