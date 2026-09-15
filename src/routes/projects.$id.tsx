import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { api, PROJECT_STATUSES, type Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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

export const Route = createFileRoute("/projects/$id")({
  component: ProjectDetailPage,
  head: () => ({ meta: [{ title: "تسلسل المشروع | نظام الإدارة التنفيذية" }] }),
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const { isLeadership, isSupervisor, profile } = useAuth();
  const people = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const qc = useQueryClient();
  const [childTitle, setChildTitle] = useState("");
  const list = useQuery({ queryKey: ["projects"], queryFn: api.projects.list });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
  const all = list.data ?? [];
  const project = all.find((p) => p.id === id);
  const canEdit =
    isLeadership ||
    isSupervisor ||
    project?.created_by === profile?.id ||
    project?.manager_id === profile?.id;
  const children = useMemo(
    () => all.filter((p) => p.parent_id === id).sort((a, b) => a.position - b.position),
    [all, id],
  );
  const linkedTasks = (tasks.data ?? []).filter((t) => t.project_id === id);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["projects"] });

  const save = useMutation({
    mutationFn: (row: Partial<Project>) => api.projects.update(id, row),
    onSuccess: () => {
      invalidate();
      toast.success("تم حفظ المشروع");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addChild = useMutation({
    mutationFn: () =>
      api.projects.create({
        title: childTitle.trim(),
        parent_id: id,
        org_unit: project?.org_unit ?? "",
        manager_id: project?.manager_id ?? null,
        created_by: profile?.id,
        status: "planned",
        position: children.length,
        predecessor_id: children.at(-1)?.id ?? null,
      }),
    onSuccess: () => {
      setChildTitle("");
      invalidate();
      toast.success("أُضيفت مرحلة إلى التسلسل");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = async (item: Project, dir: -1 | 1) => {
    const idx = children.findIndex((c) => c.id === item.id);
    const swap = children[idx + dir];
    if (!swap) return;
    await api.projects.update(item.id, { position: swap.position, predecessor_id: dir === 1 ? swap.id : item.predecessor_id });
    await api.projects.update(swap.id, { position: item.position });
    invalidate();
  };

  if (!project) {
    return <p className="text-sm text-muted-foreground">المشروع غير موجود أو لا صلاحية لعرضه.</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/projects" className="text-sm font-semibold text-primary">
        ← كل المشاريع
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.org_unit || "عام"}
            {project.manager_id
              ? ` · مسند إلى ${people.data?.find((e) => e.id === project.manager_id)?.full_name ?? ""}`
              : ""}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm("حذف المشروع وكل مراحله؟")) return;
              await api.projects.remove(id);
              window.location.href = "/projects";
            }}
          >
            <Trash2 className="size-4" /> حذف
          </Button>
        )}
      </header>

      <div className="panel grid gap-3 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>الوصف</Label>
          <Textarea
            readOnly={!canEdit}
            defaultValue={project.description}
            onBlur={(e) => canEdit && save.mutate({ description: e.target.value })}
          />
        </div>
        <div>
          <Label>يسنده إلى</Label>
          <Select
            defaultValue={project.manager_id ?? "none"}
            onValueChange={(v) => canEdit && save.mutate({ manager_id: v === "none" ? null : v })}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر شخصاً" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="none">بدون إسناد</SelectItem>
              {(people.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>الحالة</Label>
          <Select
            defaultValue={project.status}
            onValueChange={(v) => canEdit && save.mutate({ status: v })}
            disabled={!canEdit}
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
        <div>
          <Label>يعتمد على (مشروع سابق)</Label>
          <Select
            defaultValue={project.predecessor_id ?? "none"}
            onValueChange={(v) => canEdit && save.mutate({ predecessor_id: v === "none" ? null : v })}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="بدون سابق" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="none">بدون سابق</SelectItem>
              {all
                .filter((p) => p.id !== id)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>البداية</Label>
          <Input
            type="date"
            defaultValue={project.start_date ?? ""}
            readOnly={!canEdit}
            onBlur={(e) => canEdit && save.mutate({ start_date: e.target.value || null })}
          />
        </div>
        <div>
          <Label>النهاية</Label>
          <Input
            type="date"
            defaultValue={project.end_date ?? ""}
            readOnly={!canEdit}
            onBlur={(e) => canEdit && save.mutate({ end_date: e.target.value || null })}
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold">تسلسل المراحل</h2>
        <ol className="space-y-2">
          {children.map((c, i) => (
            <li key={c.id} className="panel flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold">
                  {i + 1}. {c.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {PROJECT_STATUSES[c.status] ?? c.status}
                  {c.predecessor_id
                    ? ` · بعد: ${all.find((p) => p.id === c.predecessor_id)?.title ?? ""}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => void move(c, -1)} aria-label="أعلى">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void move(c, 1)} aria-label="أسفل">
                      <ArrowDown className="size-4" />
                    </Button>
                  </>
                )}
                <Link to="/projects/$id" params={{ id: c.id }} className="text-xs font-semibold text-primary">
                  فتح
                </Link>
              </div>
            </li>
          ))}
        </ol>
        {canEdit && (
          <div className="flex gap-2">
            <Input
              value={childTitle}
              onChange={(e) => setChildTitle(e.target.value)}
              placeholder="اسم المرحلة التالية"
            />
            <Button disabled={!childTitle.trim() || addChild.isPending} onClick={() => addChild.mutate()}>
              <Plus className="size-4" /> إضافة للتسلسل
            </Button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">مهام مرتبطة</h2>
        <ul className="space-y-1 text-sm">
          {linkedTasks.map((t) => (
            <li key={t.id}>
              {t.title} — {t.assignee || "غير مسند"}
            </li>
          ))}
          {!linkedTasks.length && (
            <p className="text-sm text-muted-foreground">اربط المهام من لوحة المهام لاحقاً عبر حقل المشروع.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
