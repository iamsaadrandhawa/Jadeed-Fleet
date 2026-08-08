import { useNavigate } from "react-router-dom";
import { Menu, LogOut, Sun, Moon } from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { useUiStore } from "@/shared/store/uiStore";
import { initials } from "@/shared/lib/formatters";

export function Topbar() {
  const { profile, signOut } = useAuthStore();
  const { toggleSidebar, theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/UI/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 lg:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
            {initials(profile?.full_name)}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-neutral-900 dark:text-neutral-100">
              {profile?.full_name ?? "User"}
            </p>
            <p className="text-xs leading-tight text-neutral-500 dark:text-neutral-400">
              {profile?.role?.name ?? "—"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
