import { useQueryClient } from "@tanstack/react-query";
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

function normalizeProfile(row: AuthProfile): AuthProfile {
  const role = row.app_role;
  if (role === "manager" || role === "deputy" || role === "supervisor" || role === "member") {
    return { ...row, app_role: role };
  }
  const title = `${row.job_title ?? ""}`;
  if (title.includes("نائب مسئول")) return { ...row, app_role: "deputy" };
  if (title.includes("مسئول الاسرة") || title.includes("مسؤول الاسرة")) {
    return { ...row, app_role: "manager" };
  }
  return { ...row, app_role: "member" };
}

async function loadProfile(): Promise<AuthProfile | null> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const rpc = await (supabase as unknown as {
    rpc: (fn: string) => Promise<{ data: AuthProfile | AuthProfile[] | null; error: { message: string } | null }>;
  }).rpc("my_employee");
  const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
  if (!rpc.error && rpcRow?.id) return normalizeProfile(rpcRow);

  const byId = await supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle();
  if (!byId.error && byId.data) return normalizeProfile(byId.data as AuthProfile);

  if (user.email) {
    const byEmail = await supabase.from("employees").select("*").ilike("email", user.email).maybeSingle();
    if (!byEmail.error && byEmail.data) return normalizeProfile(byEmail.data as AuthProfile);
  }

  console.error(rpc.error ?? byId.error);
  return null;
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
    let seq = 0;

    const applySession = async (next: Session | null) => {
      const n = ++seq;
      setSession(next);
      setLoading(true);
      const nextProfile = next ? await loadProfile() : null;
      if (!mounted || n !== seq) return;
      setProfile(nextProfile);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void applySession(next);
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

  return (
    <AuthContext.Provider value={value}>
      <QueryRevalidator ready={!loading && !!session && !!profile} />
      {children}
    </AuthContext.Provider>
  );
}

function QueryRevalidator({ ready }: { ready: boolean }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (ready) void qc.invalidateQueries();
  }, [ready, qc]);
  return null;
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
