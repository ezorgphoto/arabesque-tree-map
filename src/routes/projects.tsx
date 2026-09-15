import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FolderKanban, Plus } from "lucide-react";

import { api, PROJECT_STATUSES, type Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "إدارة المشاريع | نظام الإدارة التنفيذية" }] }),
});

const empty: Partial<Project> = {
  title: "",
  description: "",
  status: "planned",
  org_unit: "",
  parent_id: null,
  predecessor_id: null,
};

function ProjectsPage() {
  const { isLeadership, isSupervisor, profile } = useAuth();
  const canEdit = isLeadership || isSupervisor;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Project>>(empty);
  const list = useQuery({ queryKey: ["projects"], queryFn: api.projects.list });
  const roots = (list.data ?? []).filter((p) => !p.parent_id);

  const save = useMutation({
    mutationFn: (row: Partial<Project>) => api.projects.create(row),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      toast.success("تم إنشاء المشروع");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <FolderKanban className="size-7 text-primary" /> إدارة المشاريع
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            خطط المشاريع وتسلسل المراحل داخل المنظومة، مع ربط كل مرحلة بما قبلها.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setForm({ ...empty, org_unit: profile?.org_unit || profile?.department || "" });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> مشروع جديد
          </Button>
        )}
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {roots.map((p) => (
          <Link
            key={p.id}
            to="/projects/$id"
            params={{ id: p.id }}
            className="panel block p-5 transition-colors hover:bg-accent/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-extrabold">{p.title}</h2>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {PROJECT_STATUSES[p.status] ?? p.status}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description || "بدون وصف"}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {p.org_unit || "عام"} · {p.start_date || "بدون بداية"} → {p.end_date || "بدون نهاية"}
            </p>
          </Link>
        ))}
        {!roots.length && (
          <p className="text-sm text-muted-foreground">لا توجد مشاريع بعد. أنشئ مشروعاً لتبدأ التسلسل.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مشروع جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>العنوان</Label>
              <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>القسم / اللجنة</Label>
              <Input
                value={form.org_unit ?? ""}
                onChange={(e) => setForm({ ...form, org_unit: e.target.value })}
              />
            </div>
            <div>
              <Label>الحالة</Label>
              <Select
                value={form.status ?? "planned"}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {Object.entries(PROJECT_STATUSES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={!form.title?.trim() || save.isPending} onClick={() => save.mutate(form)}>
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
