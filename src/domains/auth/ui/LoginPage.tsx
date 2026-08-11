import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Mail, Lock, Code, Heart, Sun, Moon, Languages } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LangContext";
import { useTranslation } from "react-i18next";

export function LoginPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const { signIn, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError("Please enter your email and password.");
      return;
    }
    const ok = await signIn(email, password);
    if (ok) {
      navigate("/UI/dashboard");
    } else {
      setFormError(error ?? "Invalid email or password.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 via-blue-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 px-4">
      {/* Top-right toggles */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <button 
          onClick={toggleLang} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-neutral-900/80 backdrop-blur shadow-sm border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
        >
          <Languages className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{lang === 'en' ? 'EN' : 'UR'}</span>
        </button>
        <button 
          onClick={toggleTheme} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-neutral-900/80 backdrop-blur shadow-sm border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-neutral-600" /> : <Sun className="w-4 h-4 text-neutral-400" />}
        </button>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Code className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">Codraze</span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-neutral-200 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-8 shadow-lg dark:border-neutral-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                <span className="text-red-500">⚠</span>
                <span>{formError}</span>
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Powered by Codraze */}
        <div className="mt-6 text-center">
          <a 
            href="https://codraze.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          >
            <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Powered by</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
              Codraze
            </span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          </a>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
          © {new Date().getFullYear()} Codraze. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
