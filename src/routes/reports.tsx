import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  currency,
  PRIORITIES,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  REPORT_TYPES,
  removeReportFile,
  reportFileUrl,
  uploadReportFile,
  type Attachment,
  type Report,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "مركز التقارير الديناميكي | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "رفع التقارير بحقول مرنة حسب القسم، إرفاق الملفات، ومتابعة حالات المراجعة والمؤشرات.",
      },
      { property: "og:title", content: "مركز التقارير الديناميكي" },
      {
        property: "og:description",
        content: "إدارة التقارير بحقول ديناميكية ومرفقات ولوحة تحليلات لحالات المراجعة.",
      },
    ],
  }),
});

type Pair = { key: string; value: string };

const emptyForm = {
  title: "",
  department: "",
  report_type: "general",
  status: "submitted",
  priority: "medium",
  submitted_by: "",
  reviewer: "",
  period_date: new Date().toISOString().slice(0, 10),
  review_notes: "",
};

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  in_review: "bg-warning/20 text-accent-foreground",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const toPairs = (obj: Record<string, unknown> | null | undefined): Pair[] =>
  Object.entries(obj ?? {}).map(([key, value]) => ({ key, value: String(value ?? "") }));

const fromPairs = (pairs: Pair[]) =>
  Object.fromEntries(pairs.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value]));

const fromNumericPairs = (pairs: Pair[]) =>
  Object.fromEntries(
    pairs.filter((p) => p.key.trim()).map((p) => [p.key.trim(), Number(p.value) || 0]),
  );

function PairEditor({
  pairs,
  setPairs,
  keyPlaceholder,
  valuePlaceholder,
  numeric,
}: {
  pairs: Pair[];
  setPairs: (p: Pair[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  numeric?: boolean;
}) {
  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={pair.key}
            placeholder={keyPlaceholder}
            onChange={(e) =>
              setPairs(pairs.map((p, idx) => (idx === i ? { ...p, key: e.target.value } : p)))
            }
          />
          <Input
            value={pair.value}
            type={numeric ? "number" : "text"}
            placeholder={valuePlaceholder}
            onChange={(e) =>
              setPairs(pairs.map((p, idx) => (idx === i ? { ...p, value: e.target.value } : p)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPairs(pairs.filter((_, idx) => idx !== i))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setPairs([...pairs, { key: "", value: "" }])}
      >
        <Plus className="ms-1 size-4" /> إضافة حقل
      </Button>
    </div>
  );
}

function ReportsPage() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: api.reports.list,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [fieldPairs, setFieldPairs] = useState<Pair[]>([]);
  const [metricPairs, setMetricPairs] = useState<Pair[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reports"] });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        fields: fromPairs(fieldPairs),
        metrics: fromNumericPairs(metricPairs),
        attachments,
      } as Partial<Report>;
      return editing ? api.reports.update(editing.id, payload) : api.reports.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث التقرير" : "تم إضافة التقرير");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.reports.update(id, { status }),
    onSuccess: () => {
      toast.success("تم تحديث حالة المراجعة");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (report: Report) => {
      for (const a of report.attachments ?? []) await removeReportFile(a.path);
      await api.reports.remove(report.id);
    },
    onSuccess: () => {
      toast.success("تم حذف التقرير");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFieldPairs([{ key: "", value: "" }]);
    setMetricPairs([{ key: "", value: "" }]);
    setAttachments([]);
    setOpen(true);
  };

  const openEdit = (r: Report) => {
    setEditing(r);
    setForm({
      title: r.title,
      department: r.department,
      report_type: r.report_type,
      status: r.status,
      priority: r.priority,
      submitted_by: r.submitted_by,
      reviewer: r.reviewer,
      period_date: r.period_date,
      review_notes: r.review_notes,
    });
    setFieldPairs(toPairs(r.fields));
    setMetricPairs(toPairs(r.metrics));
    setAttachments(r.attachments ?? []);
    setOpen(true);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`الملف ${file.name} يتجاوز 20 ميجابايت`);
          continue;
        }
        uploaded.push(await uploadReportFile(file));
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      if (uploaded.length) toast.success("تم رفع المرفقات");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openAttachment = async (path: string) => {
    try {
      const url = await reportFileUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const statusCounts = useMemo(
    () =>
      REPORT_STATUSES.map((s) => ({
        name: s.label,
        key: s.key,
        value: reports.filter((r) => r.status === s.key).length,
      })),
    [reports],
  );

  const metricTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of reports)
      for (const [k, v] of Object.entries(r.metrics ?? {}))
        totals[k] = (totals[k] ?? 0) + (Number(v) || 0);
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [reports]);

  const attachmentsCount = reports.reduce((n, r) => n + (r.attachments?.length ?? 0), 0);
  const approvalRate = reports.length
    ? Math.round((reports.filter((r) => r.status === "approved").length / reports.length) * 100)
    : 0;

  const visible = reports.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (r.title.includes(search) || r.department.includes(search) || r.submitted_by.includes(search)),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">مركز التقارير الديناميكي</h1>
          <p className="text-sm text-muted-foreground">
            حقول مرنة لكل قسم، مرفقات، ومتابعة حالات المراجعة والمؤشرات.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="ms-1 size-4" /> تقرير جديد
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "إجمالي التقارير", value: reports.length, icon: FileText },
          {
            label: "قيد المراجعة",
            value: reports.filter((r) => r.status === "in_review").length,
            icon: BarChart3,
          },
          { label: "نسبة الاعتماد", value: `${approvalRate}%`, icon: BarChart3 },
          { label: "المرفقات", value: attachmentsCount, icon: Paperclip },
        ].map((kpi) => (
          <div key={kpi.label} className="panel flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <kpi.icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-extrabold">{kpi.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-4 text-sm font-bold">توزيع حالات المراجعة</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {statusCounts.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {statusCounts.map((s, i) => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="mb-4 text-sm font-bold">أبرز المؤشرات المستخرجة</h2>
          <div className="h-64">
            {metricTotals.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricTotals}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v: number) => currency(v)} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">لا توجد مؤشرات بعد</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder="بحث بالعنوان أو القسم أو مُقدِّم التقرير"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              الكل
            </Button>
            {REPORT_STATUSES.map((s) => (
              <Button
                key={s.key}
                variant={filter === s.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">لا توجد تقارير مطابقة</p>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => (
              <article key={r.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{r.title}</h3>
                      <Badge className={statusStyle[r.status]} variant="secondary">
                        {REPORT_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                      <Badge variant="outline">{REPORT_TYPES[r.report_type] ?? r.report_type}</Badge>
                      <Badge variant="outline">أولوية {PRIORITIES[r.priority]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.department} • {r.submitted_by || "غير محدد"} • فترة {r.period_date}
                      {r.attachments?.length ? ` • ${r.attachments.length} مرفق` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={r.status}
                      onValueChange={(status) => changeStatus.mutate({ id: r.id, status })}
                    >
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_STATUSES.map((s) => (
                          <SelectItem key={s.key} value={s.key}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      {expanded === r.id ? "إخفاء التفاصيل" : "التفاصيل"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                      تعديل
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(r)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-3">
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">الحقول الديناميكية</p>
                      {Object.entries(r.fields ?? {}).length ? (
                        <ul className="space-y-1 text-sm">
                          {Object.entries(r.fields).map(([k, v]) => (
                            <li key={k} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-semibold">{String(v)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">لا توجد حقول</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">المؤشرات</p>
                      {Object.entries(r.metrics ?? {}).length ? (
                        <ul className="space-y-1 text-sm">
                          {Object.entries(r.metrics).map(([k, v]) => (
                            <li key={k} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-semibold">{currency(Number(v))}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">لا توجد مؤشرات</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">المرفقات والمراجعة</p>
                      <div className="space-y-1">
                        {(r.attachments ?? []).map((a) => (
                          <button
                            key={a.path}
                            onClick={() => openAttachment(a.path)}
                            className="flex w-full items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-start text-xs hover:bg-secondary"
                          >
                            <Paperclip className="size-3.5 shrink-0" />
                            <span className="truncate">{a.name}</span>
                          </button>
                        ))}
                        {!r.attachments?.length && (
                          <p className="text-sm text-muted-foreground">لا توجد مرفقات</p>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        المراجع: {r.reviewer || "لم يُعيَّن"}
                      </p>
                      {r.review_notes && <p className="mt-1 text-xs">{r.review_notes}</p>}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل التقرير" : "تقرير جديد"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>عنوان التقرير</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>القسم</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <Label>نوع التقرير</Label>
              <Select
                value={form.report_type}
                onValueChange={(v) => setForm({ ...form, report_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>حالة المراجعة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>مُقدِّم التقرير</Label>
              <Input
                value={form.submitted_by}
                onChange={(e) => setForm({ ...form, submitted_by: e.target.value })}
              />
            </div>
            <div>
              <Label>المراجع</Label>
              <Input
                value={form.reviewer}
                onChange={(e) => setForm({ ...form, reviewer: e.target.value })}
              />
            </div>
            <div>
              <Label>تاريخ الفترة</Label>
              <Input
                type="date"
                value={form.period_date}
                onChange={(e) => setForm({ ...form, period_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>ملاحظات المراجعة</Label>
              <Textarea
                value={form.review_notes}
                onChange={(e) => setForm({ ...form, review_notes: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-2 block">حقول مخصّصة حسب القسم</Label>
              <PairEditor
                pairs={fieldPairs}
                setPairs={setFieldPairs}
                keyPlaceholder="اسم الحقل"
                valuePlaceholder="القيمة"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-2 block">مؤشرات رقمية</Label>
              <PairEditor
                pairs={metricPairs}
                setPairs={setMetricPairs}
                keyPlaceholder="اسم المؤشر"
                valuePlaceholder="القيمة الرقمية"
                numeric
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-2 block">المرفقات (PDF / صور)</Label>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="ms-1 size-4 animate-spin" />
                ) : (
                  <Upload className="ms-1 size-4" />
                )}
                {uploading ? "جارٍ الرفع…" : "اختيار ملفات"}
              </Button>
              <div className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <div
                    key={a.path}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1.5 text-xs"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2"
                      onClick={() => openAttachment(a.path)}
                    >
                      <Paperclip className="size-3.5 shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeReportFile(a.path);
                        setAttachments(attachments.filter((x) => x.path !== a.path));
                      }}
                    >
                      <X className="size-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!form.title.trim()) {
                  toast.error("العنوان مطلوب");
                  return;
                }
                save.mutate();
              }}
              disabled={save.isPending}
            >
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
