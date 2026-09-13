import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Paperclip, Save, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, getDepartment } from "@/lib/report-templates";
import { api } from "@/lib/api";
import {
  attachmentUrl,
  createReport,
  getReport,
  updateReport,
  uploadAttachment,
} from "@/lib/reports-hub";

type Search = { id?: string | undefined };

export const Route = createFileRoute("/reports/new")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search['id'] === "string" ? { id: search['id'] as string } : {},
  head: () => ({
    meta: [
      { title: "إضافة تقرير جديد | مركز التقارير" },
      { name: "description", content: "نموذج ذكي لإضافة تقرير حسب القسم المختار." },
      { property: "og:title", content: "إضافة تقرير جديد" },
      { property: "og:description", content: "نموذج ذكي لإضافة تقرير حسب القسم المختار." },
    ],
  }),
  component: NewReportPage,
});

function NewReportPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [department, setDepartment] = useState(DEPARTMENTS[0]!.key);
  const [submitter, setSubmitter] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [employeeId, setEmployeeId] = useState("");

  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });

  const existing = useQuery({
    queryKey: ["report", id],
    queryFn: () => getReport(id as string),
    enabled: Boolean(id),
  });

  useEffect(() => {
    const row = existing.data;
    if (!row) return;
    setDepartment(row.department_type);
    setSubmitter(row.submitter_name ?? "");
    setValues((row.report_data ?? {}) as Record<string, string>);
    setFilePath(row.file_url ?? "");
    setEmployeeId(row.employee_id ?? "");
  }, [existing.data]);

  const def = useMemo(() => getDepartment(department), [department]);

  const save = useMutation({
    mutationFn: async () => {
      const first = def?.fields.find((f) => f.type === "text");
      const title = (first ? values[first.key] : "") || def?.label || "تقرير";
      const payload = {
        department_type: department,
        submitter_name: submitter.trim(),
        report_data: values,
        file_url: filePath,
        title,
        // يُرسَل فقط عند اختيار موظف (يتطلب ترحيل reports_employee_link)
        ...(employeeId ? { employee_id: employeeId } : {}),
      };
      if (id) await updateReport(id, payload);
      else await createReport(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(id ? "تم تحديث التقرير" : "تم حفظ التقرير بنجاح");
      navigate({ to: "/reports" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!submitter.trim()) {
      toast.error("اسم مقدّم التقرير مطلوب");
      return;
    }
    const missing = def?.fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) {
      toast.error(`الحقل «${missing.label}» مطلوب`);
      return;
    }
    save.mutate();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("حجم الملف يجب ألا يتجاوز ٢٠ ميغابايت");
      return;
    }
    setUploading(true);
    try {
      setFilePath(await uploadAttachment(file));
      toast.success("تم رفع الملف");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function openFile() {
    try {
      window.open(await attachmentUrl(filePath), "_blank", "noopener");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{id ? "تعديل التقرير" : "إضافة تقرير جديد"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اختر القسم لتظهر حقول التقرير الخاصة به تلقائياً.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/reports">
            <ArrowRight className="size-4" />
            العودة للوحة التقارير
          </Link>
        </Button>
      </div>

      <form
        onSubmit={submit}
        className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>القسم / نوع التقرير</Label>
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                setValues({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>اسم مقدّم التقرير</Label>
            <Input
              value={submitter}
              maxLength={100}
              onChange={(e) => setSubmitter(e.target.value)}
              placeholder="الاسم الكامل"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>الموظف المعني (اختياري)</Label>
            <Select
              value={employeeId || "none"}
              onValueChange={(v) => setEmployeeId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر موظفاً..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون موظف محدد</SelectItem>
                {(employees.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h2 className="mb-4 text-sm font-bold text-muted-foreground">
            حقول {def?.label}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {def?.fields.map((field) => {
              const value = values[field.key] ?? "";
              const set = (v: string) => setValues((s) => ({ ...s, [field.key]: v }));
              return (
                <div
                  key={field.key}
                  className={`space-y-2 ${field.type === "textarea" ? "md:col-span-2" : ""}`}
                >
                  <Label htmlFor={`f-${field.key}`}>
                    {field.label}
                    {field.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`f-${field.key}`}
                      rows={4}
                      maxLength={2000}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <Select value={value} onValueChange={set}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`f-${field.key}`}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      maxLength={field.type === "text" ? 200 : undefined}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <Label className="mb-2 block">المرفق (PDF أو صورة)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={onPickFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              رفع ملف
            </Button>
            {filePath ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm">
                <Paperclip className="size-4" />
                <button type="button" className="underline" onClick={openFile}>
                  عرض المرفق
                </button>
                <button type="button" onClick={() => setFilePath("")} aria-label="إزالة المرفق">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">لا يوجد مرفق</span>
            )}
          </div>
        </div>

        <div className="flex justify-start gap-2 border-t border-border pt-5">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {id ? "حفظ التعديلات" : "حفظ التقرير"}
          </Button>
        </div>
      </form>
    </div>
  );
}
