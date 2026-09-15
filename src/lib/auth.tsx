import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { hasStoredAccessToken, rememberAccessToken, supabase } from "@/integrations/supabase/client";
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
const PROFILE_CACHE = "exec-auth-profile";

function readCachedProfile(): AuthProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PROFILE_CACHE);
    return raw ? (JSON.parse(raw) as AuthProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: AuthProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile) window.sessionStorage.setItem(PROFILE_CACHE, JSON.stringify(profile));
    else window.sessionStorage.removeItem(PROFILE_CACHE);
  } catch {
    /* ignore */
  }
}

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
  const cached = readCachedProfile();
  const [loading, setLoading] = useState(() => !cached && !hasStoredAccessToken());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(cached);
  const userIdRef = useRef<string | null>(cached?.user_id ?? null);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    rememberAccessToken(data.session?.access_token ?? null);
    setSession(data.session);
    userIdRef.current = data.session?.user.id ?? null;
    if (data.session) {
      const next = await loadProfile();
      setProfile(next);
      writeCachedProfile(next);
    } else {
      setProfile(null);
      writeCachedProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const keepSession = (next: Session | null) => {
      rememberAccessToken(next?.access_token ?? null);
      if (next) {
        userIdRef.current = next.user.id;
        setSession(next);
      }
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      keepSession(data.session);
      if (data.session) {
        const next = await loadProfile();
        if (!mounted) return;
        setProfile(next);
        writeCachedProfile(next);
      } else if (!hasStoredAccessToken()) {
        setProfile(null);
        writeCachedProfile(null);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") {
        rememberAccessToken(null);
        userIdRef.current = null;
        setSession(null);
        setProfile(null);
        writeCachedProfile(null);
        setLoading(false);
        return;
      }
      if (!next) return;
      if (event === "SIGNED_IN" && userIdRef.current && userIdRef.current !== next.user.id) {
        keepSession(next);
        void loadProfile().then((row) => {
          if (!mounted) return;
          setProfile(row);
          writeCachedProfile(row);
        });
        return;
      }
      keepSession(next);
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
        rememberAccessToken(null);
        writeCachedProfile(null);
        setProfile(null);
        setSession(null);
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
