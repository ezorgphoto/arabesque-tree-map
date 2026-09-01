import { supabase } from "@/integrations/supabase/client";

export type Branch = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  manager: string;
  employees_count: number;
  revenue: number;
  notes: string;
  created_at: string;
};

export type Employee = {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  email: string;
  phone: string;
  salary: number;
  status: string;
  branch_id: string | null;
  hired_at: string;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  due_date: string | null;
  position: number;
  created_at: string;
};

export type OrgNode = {
  id: string;
  title: string;
  person: string;
  department: string;
  notes: string;
  parent_id: string | null;
  position: number;
  created_at: string;
};

export type Attachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};

export type Report = {
  id: string;
  title: string;
  department: string;
  report_type: string;
  status: string;
  priority: string;
  submitted_by: string;
  reviewer: string;
  period_date: string;
  review_notes: string;
  fields: Record<string, string>;
  metrics: Record<string, number>;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const api = {
  branches: {
    list: async () =>
      unwrap<Branch[]>(await supabase.from("branches").select("*").order("created_at")),
    create: async (row: Partial<Branch>) =>
      unwrap(await supabase.from("branches").insert(row as never).select().single()),
    update: async (id: string, row: Partial<Branch>) =>
      unwrap(await supabase.from("branches").update(row as never).eq("id", id).select().single()),
    remove: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },
  employees: {
    list: async () =>
      unwrap<Employee[]>(await supabase.from("employees").select("*").order("created_at")),
    create: async (row: Partial<Employee>) =>
      unwrap(await supabase.from("employees").insert(row as never).select().single()),
    update: async (id: string, row: Partial<Employee>) =>
      unwrap(await supabase.from("employees").update(row as never).eq("id", id).select().single()),
    remove: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },
  tasks: {
    list: async () =>
      unwrap<Task[]>(await supabase.from("tasks").select("*").order("position")),
    create: async (row: Partial<Task>) =>
      unwrap(await supabase.from("tasks").insert(row as never).select().single()),
    update: async (id: string, row: Partial<Task>) =>
      unwrap(await supabase.from("tasks").update(row as never).eq("id", id).select().single()),
    remove: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },
  orgNodes: {
    list: async () =>
      unwrap<OrgNode[]>(await supabase.from("org_nodes").select("*").order("position")),
    create: async (row: Partial<OrgNode>) =>
      unwrap(await supabase.from("org_nodes").insert(row as never).select().single()),
    update: async (id: string, row: Partial<OrgNode>) =>
      unwrap(await supabase.from("org_nodes").update(row as never).eq("id", id).select().single()),
    remove: async (id: string) => {
      const { error } = await supabase.from("org_nodes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },
  reports: {
    list: async () =>
      unwrap<Report[]>(
        (await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })) as never,
      ),

    create: async (row: Partial<Report>) =>
      unwrap(await supabase.from("reports").insert(row as never).select().single()),
    update: async (id: string, row: Partial<Report>) =>
      unwrap(await supabase.from("reports").update(row as never).eq("id", id).select().single()),
    remove: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  },
};

export const REPORT_BUCKET = "report-files";

export async function uploadReportFile(file: File): Promise<Attachment> {
  const safe = file.name.replace(/[^\w.\-\u0600-\u06FF]+/g, "_");
  const path = `${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(REPORT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { path, name: file.name, type: file.type, size: file.size };
}

export async function removeReportFile(path: string) {
  await supabase.storage.from(REPORT_BUCKET).remove([path]);
}

export async function reportFileUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export const REPORT_STATUSES = [
  { key: "draft", label: "مسودة" },
  { key: "submitted", label: "مُرسل" },
  { key: "in_review", label: "قيد المراجعة" },
  { key: "approved", label: "معتمد" },
  { key: "rejected", label: "مرفوض" },
] as const;

export const REPORT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_STATUSES.map((s) => [s.key, s.label]),
);

export const REPORT_TYPES: Record<string, string> = {
  general: "عام",
  financial: "مالي",
  hr: "موارد بشرية",
  operations: "تشغيلي",
  compliance: "امتثال وجودة",
  marketing: "تسويقي",
};


export const currency = (value: number) =>
  new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(value || 0);

export const TASK_COLUMNS = [
  { key: "todo", label: "قيد الانتظار" },
  { key: "in_progress", label: "قيد التنفيذ" },
  { key: "review", label: "قيد المراجعة" },
  { key: "done", label: "مكتملة" },
] as const;

export const PRIORITIES: Record<string, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export const STATUSES: Record<string, string> = {
  active: "على رأس العمل",
  vacation: "في إجازة",
  suspended: "موقوف",
};
