import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/lib/api";

export type AppRole = "manager" | "deputy" | "supervisor" | "member";

export type AuthProfile = Employee & {
  user_id?: string | null;
  app_role?: AppRole;
  org_unit?: string;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: AppRole | null;
  isLeadership: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  canManageTasks: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(): Promise<AuthProfile | null> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data as AuthProfile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) setProfile(await loadProfile());
    else setProfile(null);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) setProfile(await loadProfile());
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) setProfile(await loadProfile());
      else setProfile(null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const role = (profile?.app_role as AppRole | undefined) ?? null;
  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      isLeadership: role === "manager" || role === "deputy",
      isManager: role === "manager",
      isSupervisor: role === "supervisor",
      canManageTasks: role === "manager" || role === "deputy" || role === "supervisor",
      refresh,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [loading, session, profile, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  manager: "مسؤول العمل",
  deputy: "نائب المسؤول",
  supervisor: "مشرف قسم / لجنة",
  member: "عضو",
};
