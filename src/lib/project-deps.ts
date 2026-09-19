import { rememberAccessToken, supabase } from "@/integrations/supabase/client";

export type DepType = "FS" | "SS" | "FF" | "SF";

export type ProjectDep = {
  id: string;
  project_id: string;
  depends_on_id: string;
  dep_type: DepType;
  lag_days: number;
  created_at: string;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function withSession() {
  if (typeof window === "undefined") return;
  const { data } = await supabase.auth.getSession();
  rememberAccessToken(data.session?.access_token ?? null);
}

export const DEP_TYPE_LABEL: Record<DepType, string> = {
  FS: "انتهاء ← بدء (FS)",
  SS: "بدء ← بدء (SS)",
  FF: "انتهاء ← انتهاء (FF)",
  SF: "بدء ← انتهاء (SF)",
};

export const projectDepsApi = {
  list: async () => {
    await withSession();
    return unwrap<ProjectDep[]>(
      (await supabase
        .from("project_deps")
        .select("*")
        .order("created_at")) as never,
    );
  },
  create: async (row: {
    project_id: string;
    depends_on_id: string;
    dep_type?: DepType;
    lag_days?: number;
  }) =>
    unwrap<ProjectDep>(
      (await supabase
        .from("project_deps")
        .insert({
          project_id: row.project_id,
          depends_on_id: row.depends_on_id,
          dep_type: row.dep_type ?? "FS",
          lag_days: row.lag_days ?? 0,
        } as never)
        .select()
        .single()) as never,
    ),
  remove: async (id: string) => {
    const { error } = await supabase.from("project_deps").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
