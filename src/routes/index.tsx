import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects.list });
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
      {(tasks.error || people.error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          تعذر جلب البيانات: {(tasks.error ?? people.error)?.message}
        </div>
      )}
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
      <div className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">عمل الفريق</h2>
          <Link to="/projects" className="text-xs font-semibold text-primary">
            عرض الكل
          </Link>
        </div>
        <ul className="space-y-2 text-sm">
          {(projects.data ?? [])
            .filter((p) => !p.parent_id)
            .slice(0, 6)
            .map((p) => (
              <li key={p.id}>
                <Link to="/projects/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">
                  {p.title}
                </Link>
                <span className="text-muted-foreground"> — {p.org_unit || "عام"}</span>
              </li>
            ))}
          {!(projects.data ?? []).some((p) => !p.parent_id) && (
            <p className="text-muted-foreground">لا يوجد مشروع مشترك في قسمك بعد</p>
          )}
        </ul>
      </div>
    </div>
  );
}

function Dashboard() {
  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const branches = useQuery({ queryKey: ["branches"], queryFn: api.branches.list });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects.list });

  const emp = employees.data ?? [];
  const br = branches.data ?? [];
  const tk = tasks.data ?? [];
  const fetchError = employees.error ?? branches.error ?? tasks.error;

  const payroll = emp.reduce((s, e) => s + Number(e.salary), 0);
  const done = tk.filter((t) => t.status === "done").length;

  const byDept = Object.entries(
    emp.reduce<Record<string, number>>((acc, e) => {
      const key = e.org_unit || e.department || "غير محدد";
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
          نظرة سريعة على الأعضاء والمهام والفروع.
        </p>
      </header>

      {fetchError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          تعذر جلب البيانات: {fetchError instanceof Error ? fetchError.message : "خطأ غير معروف"}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="إجمالي الأعضاء"
          value={employees.isLoading ? "…" : String(emp.length)}
          hint="مسجلون في النظام"
          icon={Users}
        />
        <Kpi
          label="عدد الفروع"
          value={branches.isLoading ? "…" : String(br.length)}
          hint="فروع نشطة"
          icon={Building2}
        />
        <Kpi
          label="المهام المكتملة"
          value={tasks.isLoading ? "…" : `${done} / ${tk.length}`}
          hint="خلال الفترة الحالية"
          icon={CheckCircle2}
        />
        <Kpi
          label="إجمالي الرواتب"
          value={employees.isLoading ? "…" : `${currency(payroll)} ر.س`}
          hint="شهرياً"
          icon={Wallet}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">الأعضاء</h2>
          {emp.length ? (
            <ul className="divide-y text-sm">
              {emp.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-semibold">{e.full_name}</span>
                  <span className="truncate text-muted-foreground">
                    {e.job_title || e.org_unit || e.department || "عضو"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {employees.isLoading ? "جارٍ التحميل…" : "لا تظهر أسماء بعد."}
            </p>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">المهام</h2>
          <ul className="space-y-3">
            {byStatus.map((row) => {
              const max = Math.max(tk.length, 1);
              return (
                <li key={row.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{row.name}</span>
                    <span className="text-muted-foreground">{row.المهام}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((row.المهام / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {byDept.length ? (
            <div className="mt-5 border-t pt-4">
              <h3 className="mb-2 text-sm font-bold">حسب الوحدة</h3>
              <ul className="space-y-1 text-sm">
                {byDept.map((d) => (
                  <li key={d.name} className="flex justify-between gap-2">
                    <span>{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">عمل الفريق</h2>
          <Link to="/projects" className="text-xs font-semibold text-primary">
            إدارة المشاريع
          </Link>
        </div>
        <ul className="divide-y text-sm">
          {(projects.data ?? [])
            .filter((p) => !p.parent_id)
            .slice(0, 8)
            .map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <Link to="/projects/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">
                  {p.title}
                </Link>
                <span className="text-muted-foreground">{p.org_unit || "عام"}</span>
              </li>
            ))}
        </ul>
        {!(projects.data ?? []).some((p) => !p.parent_id) && (
          <p className="text-sm text-muted-foreground">عندما يضيف قسم مشروعاً سيظهر هنا تلقائياً.</p>
        )}
      </div>
    </div>
  );
}
