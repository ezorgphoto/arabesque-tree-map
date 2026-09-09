import { supabase } from "@/integrations/supabase/client";

export type HubReport = {
  id: string;
  created_at: string;
  department_type: string;
  submitter_name: string;
  report_data: Record<string, string>;
  file_url: string;
};

export async function listReports(): Promise<HubReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, created_at, department_type, submitter_name, report_data, file_url")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HubReport[];
}

export async function getReport(id: string): Promise<HubReport | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, created_at, department_type, submitter_name, report_data, file_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as unknown as HubReport | null;
}

export type ReportInput = {
  department_type: string;
  submitter_name: string;
  report_data: Record<string, string>;
  file_url: string;
  title: string;
};

export async function createReport(input: ReportInput) {
  const { error } = await supabase.from("reports").insert(input as never);
  if (error) throw new Error(error.message);
}

export async function updateReport(id: string, input: Partial<ReportInput>) {
  const { error } = await supabase
    .from("reports")
    .update(input as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const REPORT_BUCKET = "report-files";

export async function uploadAttachment(file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-\u0600-\u06FF]+/g, "_");
  const path = `${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(REPORT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(new Date(iso));
