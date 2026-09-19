import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FolderKanban, Plus } from "lucide-react";

import { api, PROJECT_STATUSES, type Project } from "@/lib/api";
import { projectDepsApi } from "@/lib/project-deps";
import { useAuth } from "@/lib/auth";
import { ProjectGantt } from "@/components/ProjectGantt";
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
  head: () => ({ meta: [{ title: "عمل الفريق | نظام الإدارة التنفيذية" }] }),
});

const empty: Partial<Project> = {
  title: "",
  description: "",
  status: "planned",
  org_unit: "",
  parent_id: null,
  predecessor_id: null,
  manager_id: null,
  start_date: null,
  end_date: null,
};

function ProjectsPage() {
  const { profile, isLeadership, isSupervisor } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Project>>(empty);
  const [tab, setTab] = useState<"list" | "gantt">("list");
  const list = useQuery({ queryKey: ["projects"], queryFn: api.projects.list });
  const deps = useQuery({ queryKey: ["project_deps"], queryFn: projectDepsApi.list });
  const people = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.list,
    enabled: isLeadership || isSupervisor,
  });
  const roots = useMemo(() => (list.data ?? []).filter((p) => !p.parent_id), [list.data]);
  const personName = (id: string | null) =>
    people.data?.find((e) => e.id === id)?.full_name ?? "غير مسند";

  const save = useMutation({
    mutationFn: (row: Partial<Project>) =>
      api.projects.create({
        ...row,
        created_by: profile?.id,
        org_unit: row.org_unit || profile?.org_unit || profile?.department || "",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      toast.success("ظهر المشروع للقسم وللمسند إليه");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <FolderKanban className="size-7 text-primary" /> عمل الفريق
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            مشاريع القسم والمسندة إليك، مع مخطط غانت والاعتمادات.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border p-0.5 text-xs font-semibold">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${tab === "list" ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => setTab("list")}
            >
              قائمة
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 ${tab === "gantt" ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => setTab("gantt")}
            >
              غانت
            </button>
          </div>
          <Button
            onClick={() => {
              setForm({
                ...empty,
                org_unit: profile?.org_unit || profile?.department || "",
                manager_id: profile?.id ?? null,
              });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> مشروع جديد
          </Button>
        </div>
      </header>

      {tab === "gantt" ? (
        <div className="panel p-5">
          <h2 className="mb-4 text-lg font-extrabold">مخطط غانت</h2>
          <ProjectGantt projects={list.data ?? []} deps={deps.data ?? []} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {roots.map((p) => (
            <Link
              key={p.id}
              to="/projects/$id"
              params={{ id: p.id }}
              className="panel block p-5 transition-colors hover:bg-muted/60"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-extrabold">{p.title}</h2>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {PROJECT_STATUSES[p.status] ?? p.status}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {p.description || "بدون وصف"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {p.org_unit || "عام"} · مسند إلى {personName(p.manager_id)}
                {p.start_date || p.end_date
                  ? ` · ${p.start_date || "؟"} → ${p.end_date || "؟"}`
                  : ""}
              </p>
            </Link>
          ))}
          {!roots.length && (
            <p className="text-sm text-muted-foreground">لا يوجد عمل مشترك بعد. أنشئ أول مشروع.</p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مشروع مشترك</DialogTitle>
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
              <Label>القسم</Label>
              <Input
                value={form.org_unit ?? ""}
                onChange={(e) => setForm({ ...form, org_unit: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>البداية</Label>
                <Input
                  type="date"
                  value={form.start_date ?? ""}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
                />
              </div>
              <div>
                <Label>النهاية</Label>
                <Input
                  type="date"
                  value={form.end_date ?? ""}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
                />
              </div>
            </div>
            <div>
              <Label>يسنده إلى</Label>
              <Select
                value={form.manager_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, manager_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر شخصاً" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">بدون إسناد بعد</SelectItem>
                  {(people.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
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
              إنشاء ومشاركة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
