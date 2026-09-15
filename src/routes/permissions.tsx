import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield } from "lucide-react";

import { api, type Employee } from "@/lib/api";
import { ROLE_LABEL, useAuth, type AppRole } from "@/lib/auth";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/permissions")({
  component: PermissionsPage,
  head: () => ({ meta: [{ title: "الصلاحيات | نظام الإدارة التنفيذية" }] }),
});

function PermissionsPage() {
  const { isManager } = useAuth();
  const qc = useQueryClient();
  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });

  const save = useMutation({
    mutationFn: (row: Partial<Employee> & { id: string }) => {
      const { id, app_role, org_unit, email, department } = row;
      return api.employees.update(id, { app_role, org_unit, email, department: org_unit || department });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("تم حفظ الصلاحية");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isManager) return <Navigate to="/" />;

  const rows = employees.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold">
          <Shield className="size-7 text-primary" /> الصلاحيات والحسابات
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          عيّن الدور والقسم والبريد. بعد حفظ البريد يطلب من الشخص إنشاء حساب من صفحة الدخول بنفس البريد.
        </p>
      </header>
      <div className="panel overflow-x-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">القسم / اللجنة</TableHead>
              <TableHead className="text-right">بريد الدخول</TableHead>
              <TableHead className="text-right">حساب</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <PermRow key={e.id} employee={e} onSave={(p) => save.mutate({ id: e.id, ...p })} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PermRow({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave: (p: Partial<Employee>) => void;
}) {
  const role = (employee.app_role ?? "member") as AppRole;
  return (
    <TableRow>
      <TableCell className="font-semibold">
        {employee.full_name}
        <div className="text-xs font-normal text-muted-foreground">{employee.job_title}</div>
      </TableCell>
      <TableCell>
        <Select defaultValue={role} onValueChange={(v) => onSave({ app_role: v as AppRole })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(Object.keys(ROLE_LABEL) as AppRole[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ROLE_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          defaultValue={employee.org_unit || employee.department || ""}
          placeholder="مثل: الاعلام"
          onBlur={(ev) => onSave({ org_unit: ev.target.value, department: ev.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          dir="ltr"
          defaultValue={employee.email}
          placeholder="email@example.com"
          onBlur={(ev) => onSave({ email: ev.target.value.trim() })}
        />
      </TableCell>
      <TableCell className="text-xs">
        {employee.user_id ? "مربوط" : "لا يوجد"}
      </TableCell>
    </TableRow>
  );
}
