import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeMap: Record<NonNullable<ModalProps["size"]>, string> = {
  xs: "sm:max-w-xs",
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-lg border border-neutral-200 bg-white shadow-xl animate-in dark:border-neutral-700 dark:bg-neutral-900 sm:rounded-lg sm:max-h-[80vh] ${sizeMap[size]}`}
      >
        {title && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}