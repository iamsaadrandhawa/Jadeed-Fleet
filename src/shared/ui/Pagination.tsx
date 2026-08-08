import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
      <p className="text-neutral-500 dark:text-neutral-400">
        Showing <span className="font-medium text-neutral-700 dark:text-neutral-300">{start}</span>–
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{end}</span> of{" "}
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:disabled:hover:bg-neutral-900"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-neutral-700 dark:text-neutral-300">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:disabled:hover:bg-neutral-900"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
