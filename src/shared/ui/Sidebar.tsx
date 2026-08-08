import { NavLink, useLocation } from "react-router-dom";
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
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { useUiStore } from "@/shared/store/uiStore";
import { canView } from "@/shared/lib/permissions";
import type { Domain } from "@/shared/lib/types";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  domain: Domain;
  badge?: string;
  badgeColor?: "blue" | "green" | "red" | "yellow" | "purple";
}

const NAV_ITEMS: NavItem[] = [
  { 
    to: "/UI/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    domain: "dashboard",
    badge: "Live",
    badgeColor: "green"
  },
  { 
    to: "/UI/drivers", 
    label: "Drivers", 
    icon: UsersIcon, 
    domain: "drivers" 
  },
  { 
    to: "/UI/vehicles", 
    label: "Vehicles", 
    icon: Car, 
    domain: "vehicles" 
  },
  { 
    to: "/UI/users", 
    label: "Users", 
    icon: UserCog, 
    domain: "users" 
  },
  { 
    to: "/UI/roles", 
    label: "Roles", 
    icon: ShieldCheck, 
    domain: "roles" 
  },
  { 
    to: "/UI/logs", 
    label: "Audit Logs", 
    icon: ScrollText, 
    domain: "logs" 
  },
  { 
    to: "/UI/settings", 
    label: "Settings", 
    icon: SettingsIcon, 
    domain: "settings" 
  },
];

export function Sidebar() {
  const { permissions } = useAuthStore();
  const { sidebarOpen, setSidebar } = useUiStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const items = NAV_ITEMS.filter((item) => canView(permissions, item.domain));

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white shadow-lg transition-all duration-300 lg:static lg:translate-x-0 dark:bg-neutral-900 dark:shadow-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "w-[64px]" : "w-[240px]"}`}
      >
        {/* Brand Section with collapse toggle */}
        <div className={`flex h-16 items-center justify-between border-b border-neutral-200/50 px-3 dark:border-neutral-800/50 ${
          isCollapsed ? "justify-center" : ""
        }`}>
          <div 
            className={`flex items-center gap-3 cursor-pointer ${isCollapsed ? "justify-center w-full" : ""}`}
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="relative flex-shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-blue-600 text-white shadow-lg shadow-red-500/20">
                <Truck size={isCollapsed ? 20 : 18} />
              </div>
              {!isCollapsed && (
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-900">
                  <span className="sr-only">Active</span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="leading-tight">
                <span className="block text-base font-bold tracking-tight text-neutral-900 dark:text-white">
                  Jadeed <span className="text-red-600 dark:text-red-500">Fleet</span>Pro
                </span>
                
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button
              onClick={() => setSidebar(false)}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
          {!isCollapsed && (
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Menu
            </div>
          )}
          
          <div className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebar(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-red-50 to-blue-50 text-red-700 dark:from-red-950/30 dark:to-blue-950/30 dark:text-red-400"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    } ${isCollapsed ? "justify-center px-2" : ""}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                        <Icon 
                          size={isCollapsed ? 20 : 18} 
                          className={
                            isActive
                              ? "text-red-600 dark:text-red-400"
                              : "text-neutral-400 group-hover:text-red-600 dark:text-neutral-500 dark:group-hover:text-red-400"
                          }
                        />
                        {!isCollapsed && (
                          <span className={isActive ? "text-red-700 dark:text-red-400" : ""}>
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && item.badge && (
                        <span 
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.badgeColor === "green" 
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : item.badgeColor === "blue"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : item.badgeColor === "red"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : item.badgeColor === "yellow"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                              : item.badgeColor === "purple"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isCollapsed && isActive && (
                        <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 bg-red-500 rounded-r" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {!isCollapsed && (
            <>
              <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-red-500/50 to-blue-500/50"></div>
                <span className="text-[8px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Navigation</span>
                <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-red-500/50"></div>
              </div>
            </>
          )}
        </nav>

        {/* Collapse/Expand Toggle Button
        <div className="border-t border-neutral-200/50 px-2 py-2 dark:border-neutral-800/50">
          <button
            onClick={toggleCollapse}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div> */}

        {/* Footer - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="border-t border-neutral-200/50 px-4 py-3 dark:border-neutral-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                © 2026
              </span>
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                <Activity size={10} className="text-red-500" />
                Online
              </span>
            </div>
          </div>
        )}

        {/* Footer - Minimal when collapsed */}
        {isCollapsed && (
          <div className="flex items-center justify-center border-t border-neutral-200/50 px-2 py-3 dark:border-neutral-800/50">
            <Activity size={14} className="text-red-500" />
          </div>
        )}
      </aside>
    </>
  );
}