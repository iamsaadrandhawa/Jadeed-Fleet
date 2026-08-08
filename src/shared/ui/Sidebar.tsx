import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Car,
  UserCog,
  ShieldCheck,
  ScrollText,
  Settings as SettingsIcon,
  X,
  Truck,
} from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { useUiStore } from "@/shared/store/uiStore";
import { canView } from "@/shared/lib/permissions";
import type { Domain } from "@/shared/lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  domain: Domain;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/UI/dashboard", label: "Dashboard", icon: LayoutDashboard, domain: "dashboard" },
  { to: "/UI/drivers", label: "Drivers", icon: UsersIcon, domain: "drivers" },
  { to: "/UI/vehicles", label: "Vehicles", icon: Car, domain: "vehicles" },
  { to: "/UI/users", label: "Users", icon: UserCog, domain: "users" },
  { to: "/UI/roles", label: "Roles", icon: ShieldCheck, domain: "roles" },
  { to: "/UI/logs", label: "Audit Logs", icon: ScrollText, domain: "logs" },
  { to: "/UI/settings", label: "Settings", icon: SettingsIcon, domain: "settings" },
];

export function Sidebar() {
  const { permissions } = useAuthStore();
  const { sidebarOpen, setSidebar } = useUiStore();

  const items = NAV_ITEMS.filter((item) => canView(permissions, item.domain));

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/40 lg:hidden dark:bg-black/60"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 dark:border-neutral-800 dark:bg-neutral-900 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
              <Truck size={18} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Fleet
            </span>
          </div>
          <button
            onClick={() => setSidebar(false)}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebar(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-4 text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
          Fleet Management v1.0
        </div>
      </aside>
    </>
  );
}
