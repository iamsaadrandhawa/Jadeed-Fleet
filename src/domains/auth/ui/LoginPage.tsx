import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";


export function LoginPage() {
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
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-800 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
            <Input
              name="password"
              type="password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </Button>
          </form>
        </div>
      </div>
      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
        © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
