import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/shared/lib/supabaseClient";
import type { Profile, Permissions } from "@/shared/lib/types";
import { emptyPermissions } from "@/shared/lib/types";

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  permissions: Permissions | null;
  loading: boolean;
  error: string | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  session: null,
  user: null,
  profile: null,
  permissions: emptyPermissions(),
  loading: false,
  error: null,

  init: () => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data.session;
      set({ session: s, user: s?.user ?? null });
      if (s) {
        get().refreshProfile().finally(() => set({ ready: true }));
      } else {
        set({ ready: true });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;
        set({ session, user: session?.user ?? null });
        if (session) {
          await get().refreshProfile();
        } else {
          set({ profile: null, permissions: null });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  },

  refreshProfile: async () => {
    const uid = get().user?.id;
    if (!uid) {
      set({ profile: null, permissions: null });
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*, role:roles(*)")
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      set({ error: error.message });
      return;
    }
    const profile = data as Profile | null;
    set({
      profile,
      permissions: profile?.role?.permissions ?? null,
    });
  },

  setProfile: (profile) =>
    set({
      profile,
      permissions: profile?.role?.permissions ?? null,
    }),

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ loading: false, error: error.message });
      return false;
    }
    set({ loading: false });
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, permissions: null, session: null, user: null });
  },
}));
