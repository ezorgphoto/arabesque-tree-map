import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  ChevronDown,
  FileBarChart2,
  Layers,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, DEPARTMENT_LABELS, getDepartment } from "@/lib/report-templates";
import { attachmentUrl, deleteReport, formatDate, listReports } from "@/lib/reports-hub";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "لوحة التقارير والعمليات | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "مؤشرات الأداء وسجل تقارير جميع الأقسام مع البحث والتصفية والتعديل.",
      },
      { property: "og:title", content: "لوحة التقارير والعمليات" },
      {
        property: "og:description",
        content: "مؤشرات الأداء وسجل تقارير جميع الأقسام مع البحث والتصفية والتعديل.",
      },
    ],
  }),
  component: ReportsDashboard,
});

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#64748b",
];

function ReportsDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [openRow, setOpenRow] = useState<string | null>(null);

  const reports = useQuery({ queryKey: ["reports"], queryFn: listReports });
  const rows = reports.data ?? [];

  const remove = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("تم حذف التقرير");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim();
    return rows.filter((r) => {
      if (dept !== "all" && r.department_type !== dept) return false;
      if (!q) return true;
      const haystack = [
        r.submitter_name,
        DEPARTMENT_LABELS[r.department_type] ?? "",
        ...Object.values(r.report_data ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q.toLowerCase());
    });
  }, [rows, search, dept]);

  const byDept = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        name: d.label,
        value: rows.filter((r) => r.department_type === d.key).length,
      })).filter((d) => d.value > 0),
    [rows],
  );

  const submitters = useMemo(
    () => new Set(rows.map((r) => r.submitter_name).filter(Boolean)).size,
    [rows],
  );
  const withFiles = useMemo(() => rows.filter((r) => r.file_url).length, [rows]);

  async function openFile(path: string) {
    try {
      window.open(await attachmentUrl(path), "_blank", "noopener");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">مركز التقارير والعمليات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            متابعة تقارير جميع الأقسام في مكان واحد.
          </p>
        </div>
        <Button asChild>
          <Link to="/reports/new">
            <Plus className="size-4" />
            إضافة تقرير جديد
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="إجمالي التقارير" value={rows.length} icon={FileBarChart2} />
        <KpiCard label="الأقسام النشطة" value={byDept.length} icon={Layers} />
        <KpiCard label="عدد المقدّمين" value={submitters} icon={Users} />
        <KpiCard label="تقارير بمرفقات" value={withFiles} icon={Paperclip} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">التقارير حسب القسم</h2>
        {byDept.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
        ) : (
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byDept.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <Input
            className="max-w-xs"
            placeholder="بحث في التقارير..."
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} تقرير
          </span>
        </div>

        {reports.isLoading ? (
          <p className="p-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">لا توجد تقارير مطابقة.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">القسم</th>
                  <th className="px-4 py-3 font-semibold">مقدّم التقرير</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">المرفق</th>
                  <th className="px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const def = getDepartment(r.department_type);
                  const isOpen = openRow === r.id;
                  return (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <button
                          className="flex items-center gap-2 font-semibold"
                          onClick={() => setOpenRow(isOpen ? null : r.id)}
                        >
                          <ChevronDown
                            className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                          <Building2 className="size-4 text-muted-foreground" />
                          {DEPARTMENT_LABELS[r.department_type] ?? r.department_type}
                        </button>
                        {isOpen ? (
                          <dl className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 md:grid-cols-2">
                            {(def?.fields ?? []).map((f) => (
                              <div key={f.key} className="text-xs">
                                <dt className="text-muted-foreground">{f.label}</dt>
                                <dd className="font-semibold">
                                  {r.report_data?.[f.key] || "—"}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{r.submitter_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {r.file_url ? (
                          <Badge
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => openFile(r.file_url)}
                          >
                            <Paperclip className="size-3" /> عرض
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="تعديل"
                            onClick={() =>
                              navigate({ to: "/reports/new", search: { id: r.id } })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="حذف"
                            onClick={() => {
                              if (confirm("هل تريد حذف هذا التقرير؟")) remove.mutate(r.id);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
