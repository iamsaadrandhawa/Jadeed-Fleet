import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { canView, isSuperAdmin } from "@/shared/lib/permissions";
import type { Domain } from "@/shared/lib/types";
import { Layout } from "@/shared/ui/Layout";

export function ProtectedRoute({
  domain,
  children,
}: {
  domain: Domain;
  children: ReactNode;
}) {
  const { ready, session, permissions, profile } = useAuthStore();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/UI/login" replace />;
  }

  if (!canView(permissions, domain) || ((domain === "users" || domain === "roles") && !isSuperAdmin(profile))) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Not authorized</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            You don't have permission to view this page.
          </p>
          <a
            href="/UI/dashboard"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Go to Dashboard
          </a>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}
