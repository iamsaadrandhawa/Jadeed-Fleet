import { useNavigate } from "react-router-dom";
import { Menu, LogOut, Sun, Moon, User, Settings, ShieldCheck, Mail, Circle, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { useUiStore } from "@/shared/store/uiStore";
import { initials } from "@/shared/lib/formatters";
import { useState, useRef, useEffect } from "react";

export function Topbar() {
  const { profile, signOut } = useAuthStore();
  const { toggleSidebar, theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await signOut();
    navigate("/UI/login");
  };

  const handleProfile = () => {
    setIsMenuOpen(false);
    navigate("/UI/profile");
  };

  const handleSettings = () => {
    setIsMenuOpen(false);
    navigate("/UI/settings");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80 lg:px-6">
      {/* Left - Menu button */}
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 lg:hidden"
      >
        <Menu size={20} />
      </button>
      
      <div className="hidden lg:block" />
      
      {/* Right - Actions and User Menu */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-blue-500 text-xs font-semibold text-white shadow-md">
              {initials(profile?.full_name)}
            </div>
            
            <ChevronDown 
              size={14} 
              className={`text-neutral-400 transition-transform duration-200 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Info */}
              <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-blue-500 text-lg font-semibold text-white shadow-lg">
                    {initials(profile?.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {profile?.full_name ?? "User"}
                    </p>
                   
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <ShieldCheck size={10} className="text-neutral-400" />
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 capitalize">
                        {profile?.role?.name ?? "User"}
                      </span>
                      <Circle size={6} className="fill-emerald-500 text-emerald-500" />
                      <span className="text-[10px] text-emerald-500">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-1">
               
                <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
                <button 
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>

              
            </div>
          )}
        </div>
      </div>
    </header>
  );
}