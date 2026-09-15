import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Building2, CheckCircle2, Wallet } from "lucide-react";
import { api, currency, TASK_COLUMNS } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { scheduleApi } from "@/lib/extras";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "لوحة القيادة | نظام الإدارة التنفيذية" },
      { name: "description", content: "مؤشرات الأداء الرئيسية للفروع والموظفين والمهام." },
      { property: "og:title", content: "لوحة القيادة | نظام الإدارة التنفيذية" },
      { property: "og:description", content: "مؤشرات الأداء الرئيسية للفروع والموظفين والمهام." },
    ],
  }),
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function HomePage() {
  const { isLeadership, isSupervisor } = useAuth();
  return isLeadership ? <Dashboard /> : <MemberHome isSupervisor={isSupervisor} />;
}

function MemberHome({ isSupervisor }: { isSupervisor: boolean }) {
  const { profile } = useAuth();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
  const people = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const schedule = useQuery({ queryKey: ["weekly_schedule"], queryFn: scheduleApi.list });
  const tk = tasks.data ?? [];
  const mates = (people.data ?? []).filter((e) => e.id !== profile?.id);
  const open = tk.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">مرحباً {profile?.full_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSupervisor ? "مشرف القسم — مهام لجنتك وأعضاؤها" : profile?.job_title}
          {profile?.org_unit || profile?.department
            ? ` — ${profile?.org_unit || profile?.department}`
            : ""}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs font-semibold text-muted-foreground">
            {isSupervisor ? "مهام القسم المفتوحة" : "مهامي المفتوحة"}
          </p>
          <p className="text-2xl font-extrabold">{open}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-semibold text-muted-foreground">زملاء القسم</p>
          <p className="text-2xl font-extrabold">{mates.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-semibold text-muted-foreground">مواعيد المخطط</p>
          <p className="text-2xl font-extrabold">{schedule.data?.length ?? 0}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-3 font-extrabold">{isSupervisor ? "مهام القسم" : "مهامي"}</h2>
          <ul className="space-y-2 text-sm">
            {tk.slice(0, 8).map((t) => (
              <li key={t.id} className="flex justify-between gap-2 border-b pb-2 last:border-0">
                <span className="font-semibold">{t.title}</span>
                <span className="text-muted-foreground">{TASK_COLUMNS.find((c) => c.key === t.status)?.label}</span>
              </li>
            ))}
            {!tk.length && <p className="text-muted-foreground">لا توجد مهام مسندة إليك</p>}
          </ul>
        </div>
        <div className="panel p-5">
          <h2 className="mb-3 font-extrabold">من يعمل معي</h2>
          <ul className="space-y-2 text-sm">
            {mates.map((e) => (
              <li key={e.id}>
                <span className="font-semibold">{e.full_name}</span>
                <span className="text-muted-foreground"> — {e.job_title || "عضو"}</span>
              </li>
            ))}
            {!mates.length && (
              <p className="text-muted-foreground">سيظهر زملاء قسمك هنا بعد تعيين القسم من المسؤول</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const branches = useQuery({ queryKey: ["branches"], queryFn: api.branches.list });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });

  const emp = employees.data ?? [];
  const br = branches.data ?? [];
  const tk = tasks.data ?? [];

  const payroll = emp.reduce((s, e) => s + Number(e.salary), 0);
  const done = tk.filter((t) => t.status === "done").length;

  const byBranch = br.map((b) => ({
    name: b.name,
    الإيرادات: Number(b.revenue),
    الموظفون: emp.filter((e) => e.branch_id === b.id).length,
  }));

  const byDept = Object.entries(
    emp.reduce<Record<string, number>>((acc, e) => {
      const key = e.department || "غير محدد";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const byStatus = TASK_COLUMNS.map((c) => ({
    name: c.label,
    المهام: tk.filter((t) => t.status === c.key).length,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">لوحة القيادة</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نظرة شاملة على أداء المؤسسة وفروعها في الوقت الحالي.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="إجمالي الموظفين" value={String(emp.length)} hint="مسجلون في النظام" icon={Users} />
        <Kpi label="عدد الفروع" value={String(br.length)} hint="فروع نشطة" icon={Building2} />
        <Kpi
          label="المهام المكتملة"
          value={`${done} / ${tk.length}`}
          hint="خلال الفترة الحالية"
          icon={CheckCircle2}
        />
        <Kpi label="إجمالي الرواتب" value={`${currency(payroll)} ر.س`} hint="شهرياً" icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">الإيرادات حسب الفرع</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} orientation="right" />
                <Tooltip />
                <Legend />
                <Bar dataKey="الإيرادات" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-bold">توزيع الموظفين حسب الإدارة</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byDept} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {byDept.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="mb-4 text-lg font-bold">حالة المهام</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} orientation="right" />
              <Tooltip />
              <Line type="monotone" dataKey="المهام" stroke="var(--chart-3)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
