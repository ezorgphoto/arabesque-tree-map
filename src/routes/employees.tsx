import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, currency, STATUSES, type Employee } from "@/lib/api";
import { ROLE_LABEL, useAuth } from "@/lib/auth";
import { listReports, formatDate } from "@/lib/reports-hub";
import { DEPARTMENT_LABELS } from "@/lib/report-templates";
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

export const Route = createFileRoute("/employees")({
  component: EmployeesPage,
  head: () => ({
    meta: [
      { title: "الموظفون | نظام الإدارة التنفيذية" },
      { name: "description", content: "إدارة بيانات الموظفين: إضافة وتعديل وحذف." },
      { property: "og:title", content: "الموظفون | نظام الإدارة التنفيذية" },
      { property: "og:description", content: "إدارة بيانات الموظفين: إضافة وتعديل وحذف." },
    ],
  }),
});

const empty: Partial<Employee> = {
  full_name: "",
  job_title: "",
  department: "",
  email: "",
  phone: "",
  salary: 0,
  status: "active",
  branch_id: null,
  org_unit: "",
  app_role: "member",
};

// مستويات التقييم (فكري / شرعي / تدريبي)
const LEVELS = ["مبتدئ", "متوسط", "متقدم", "متميز"] as const;

// الحقول التي يحفظها ملف الموظف (تتطلب ترحيل employees_profile_fields)
const PROFILE_FIELDS: (keyof Employee)[] = [
  "personality_type",
  "strengths",
  "problems",
  "profile_notes",
  "intellectual_level",
  "religious_level",
  "training_level",
];

function EmployeesPage() {
  const { isLeadership, isManager } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>(empty);
  const [term, setTerm] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Partial<Employee>>({});

  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const branches = useQuery({ queryKey: ["branches"], queryFn: api.branches.list });
  const reports = useQuery({ queryKey: ["reports"], queryFn: listReports });
  const relatedReports = (reports.data ?? []).filter((r) => r.employee_id === profile.id);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["employees"] });

  const save = useMutation({
    mutationFn: async (payload: Partial<Employee>) => {
      const { id, created_at, ...rest } = payload;
      return id ? api.employees.update(id, rest) : api.employees.create(rest);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("تم حفظ بيانات الموظف بنجاح");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: api.employees.remove,
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الموظف");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async (payload: Partial<Employee>) => {
      const { id } = payload;
      if (!id) throw new Error("معرّف الموظف مفقود");
      const patch: Partial<Employee> = {};
      for (const key of PROFILE_FIELDS) {
        patch[key] = (payload[key] ?? "") as never;
      }
      return api.employees.update(id, patch);
    },
    onSuccess: () => {
      invalidate();
      setProfileOpen(false);
      toast.success("تم حفظ ملف الموظف");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openProfile = (e: Employee) => {
    setProfile(e);
    setProfileOpen(true);
  };

  const setProfileField = (key: keyof Employee, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const rows = (employees.data ?? []).filter((e) =>
    [e.full_name, e.job_title, e.department, e.email, e.org_unit].join(" ").includes(term.trim()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{isLeadership ? "الموظفون" : "زملاء القسم"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLeadership
              ? "سجل الأعضاء مع القسم والصلاحية. ضع بريداً لكل شخص ثم اطلب منه إنشاء حساب من صفحة الدخول."
              : "الأعضاء العاملون معك في القسم. لا يمكنك الاطلاع على مهام أو ملفات الآخرين الخاصة."}
          </p>
        </div>
        {isLeadership && (
          <Button
            onClick={() => {
              setForm(empty);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> إضافة موظف
          </Button>
        )}
      </header>

      {employees.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          تعذر جلب الأعضاء: {employees.error.message}
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث بالاسم أو المهمة..."
              className="pr-9"
            />
          </div>
        </div>
        <ul className="divide-y">
          {rows.map((e) => {
            const unit = e.org_unit || e.department;
            const role = e.app_role && e.app_role in ROLE_LABEL ? ROLE_LABEL[e.app_role] : null;
            return (
              <li key={e.id} className="flex w-full items-center gap-3 px-4 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                  {e.full_name.trim().slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{e.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {e.job_title || "بدون مسمى"}
                    {unit && unit !== "عام" ? ` · ${unit}` : ""}
                  </p>
                </div>
                {role ? (
                  <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:block">
                    {role}
                  </span>
                ) : null}
                <Badge variant={e.status === "active" ? "default" : "secondary"}>
                  {STATUSES[e.status] ?? e.status}
                </Badge>
                {isLeadership && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="الملف الشخصي والتقييم"
                      title="الملف الشخصي والتقييم"
                      onClick={() => openProfile(e)}
                    >
                      <ClipboardList className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="تعديل"
                      onClick={() => {
                        setForm(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {isManager && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="حذف"
                        onClick={() => {
                          if (confirm(`حذف ${e.full_name}؟`)) remove.mutate(e.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {!rows.length && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">لا يوجد أعضاء مطابقون.</li>
          )}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={form.full_name ?? ""}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="مثال: أحمد العتيبي"
              />
            </div>
            <div>
              <Label>المسمى الوظيفي</Label>
              <Input
                value={form.job_title ?? ""}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                placeholder="مدير مشاريع"
              />
            </div>
            <div>
              <Label>القسم (للزملاء والصلاحيات)</Label>
              <Input
                value={form.org_unit ?? form.department ?? ""}
                onChange={(e) => setForm({ ...form, org_unit: e.target.value, department: e.target.value })}
                placeholder="مثال: الاعلام أو الاغاثي"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني (لحساب الدخول)</Label>
              <Input
                dir="ltr"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <Label>رقم الجوال</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="05xxxxxxxx"
              />
            </div>
            <div>
              <Label>الراتب</Label>
              <Input
                type="number"
                value={String(form.salary ?? 0)}
                onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>الحالة</Label>
              <Select
                value={form.status ?? "active"}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {Object.entries(STATUSES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الصلاحية</Label>
              <Select
                value={form.app_role ?? "member"}
                onValueChange={(v) => setForm({ ...form, app_role: v as Employee["app_role"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="member">عضو</SelectItem>
                  <SelectItem value="supervisor">مشرف قسم / لجنة</SelectItem>
                  <SelectItem value="deputy">نائب المسؤول</SelectItem>
                  {isManager && <SelectItem value="manager">مسؤول العمل</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>الفرع</Label>
              <Select
                value={form.branch_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون فرع</SelectItem>
                  {(branches.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!form.full_name?.trim() || save.isPending}
              onClick={() => save.mutate(form)}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>الملف الشخصي والتقييم — {profile.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>نمط الشخصية</Label>
              <Input
                value={profile.personality_type ?? ""}
                onChange={(e) => setProfileField("personality_type", e.target.value)}
                placeholder="مثال: منظّم تحليلي، قيادي، تعاوني..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>المستوى الفكري</Label>
                <Select
                  value={profile.intellectual_level ?? ""}
                  onValueChange={(v) => setProfileField("intellectual_level", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المستوى الشرعي</Label>
                <Select
                  value={profile.religious_level ?? ""}
                  onValueChange={(v) => setProfileField("religious_level", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المستوى التدريبي</Label>
                <Select
                  value={profile.training_level ?? ""}
                  onValueChange={(v) => setProfileField("training_level", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>نقاط القوة</Label>
              <Textarea
                value={profile.strengths ?? ""}
                onChange={(e) => setProfileField("strengths", e.target.value)}
                placeholder="أبرز مهارات وقدرات الموظف..."
              />
            </div>
            <div>
              <Label>المشاكل والتحديات</Label>
              <Textarea
                value={profile.problems ?? ""}
                onChange={(e) => setProfileField("problems", e.target.value)}
                placeholder="التحديات أو الملاحظات التي تحتاج متابعة..."
              />
            </div>
            <div>
              <Label>ملاحظات عامة</Label>
              <Textarea
                value={profile.profile_notes ?? ""}
                onChange={(e) => setProfileField("profile_notes", e.target.value)}
                placeholder="ملاحظات إضافية حول الموظف..."
              />
            </div>
            <div className="border-t pt-3">
              <Label>تقارير الأقسام المرتبطة ({relatedReports.length})</Label>
              <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-2">
                {relatedReports.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    لا توجد تقارير مرتبطة بهذا الموظف بعد. اربط تقريراً به من «مركز التقارير».
                  </p>
                ) : (
                  relatedReports.map((r) => (
                    <div key={r.id} className="rounded-md border bg-background p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {DEPARTMENT_LABELS[r.department_type] ?? r.department_type}
                        </span>
                        <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                      </div>
                      {r.submitter_name && (
                        <p className="mt-0.5 text-muted-foreground">مقدّم: {r.submitter_name}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={saveProfile.isPending} onClick={() => saveProfile.mutate(profile)}>
              حفظ الملف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
