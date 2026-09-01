import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, currency, STATUSES, type Employee } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
};

function EmployeesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>(empty);
  const [term, setTerm] = useState("");

  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const branches = useQuery({ queryKey: ["branches"], queryFn: api.branches.list });

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

  const rows = (employees.data ?? []).filter((e) =>
    [e.full_name, e.job_title, e.department, e.email].join(" ").includes(term.trim()),
  );

  const branchName = (id: string | null) =>
    branches.data?.find((b) => b.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">الموظفون</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجل الموظفين الكامل مع إمكانية الإضافة والتعديل والحذف.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(empty);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> إضافة موظف
        </Button>
      </header>

      <div className="panel p-4">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث بالاسم أو المسمى الوظيفي..."
            className="pr-9"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المسمى الوظيفي</TableHead>
                <TableHead className="text-right">الإدارة</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">الراتب</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-semibold">{e.full_name}</TableCell>
                  <TableCell>{e.job_title}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{branchName(e.branch_id)}</TableCell>
                  <TableCell>{currency(Number(e.salary))} ر.س</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "active" ? "default" : "secondary"}>
                      {STATUSES[e.status] ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm(e);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`حذف الموظف ${e.full_name}؟`)) remove.mutate(e.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    لا يوجد موظفون مطابقون.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
              <Label>الإدارة</Label>
              <Input
                value={form.department ?? ""}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="المالية"
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@corp.sa"
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
    </div>
  );
}
