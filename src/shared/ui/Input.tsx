import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...rest }, ref) => {
    const inputId = id || rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-10 px-3 rounded-md border bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:border-neutral-700 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900 ${
            error ? "border-red-300 focus-visible:ring-red-400 dark:border-red-700" : "border-neutral-300"
          } ${className}`}
          {...rest}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", id, children, ...rest }, ref) => {
    const selectId = id || rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-10 px-3 rounded-md border bg-white text-sm text-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900 ${
            error ? "border-red-300 dark:border-red-700" : "border-neutral-300"
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    const textareaId = id || rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-neutral-700 mb-1.5 dark:text-neutral-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full px-3 py-2 rounded-md border bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:border-neutral-700 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900 ${
            error ? "border-red-300 dark:border-red-700" : "border-neutral-300"
          } ${className}`}
          {...rest}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
