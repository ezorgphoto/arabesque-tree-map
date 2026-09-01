import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { api, type OrgNode } from "@/lib/api";
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

export const Route = createFileRoute("/hierarchy")({
  component: HierarchyPage,
  head: () => ({
    meta: [
      { title: "الهيكل التنظيمي | نظام الإدارة التنفيذية" },
      { name: "description", content: "شجرة تنظيمية تفاعلية مع ملاحظات قابلة للحفظ لكل وحدة." },
      { property: "og:title", content: "الهيكل التنظيمي | نظام الإدارة التنفيذية" },
      {
        property: "og:description",
        content: "شجرة تنظيمية تفاعلية مع ملاحظات قابلة للحفظ لكل وحدة.",
      },
    ],
  }),
});

function HierarchyPage() {
  const qc = useQueryClient();
  const nodes = useQuery({ queryKey: ["org_nodes"], queryFn: api.orgNodes.list });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<OrgNode>>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["org_nodes"] });

  const save = useMutation({
    mutationFn: async (payload: Partial<OrgNode>) => {
      const { id, created_at, ...rest } = payload;
      return id ? api.orgNodes.update(id, rest) : api.orgNodes.create(rest);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("تم حفظ الوحدة التنظيمية");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => api.orgNodes.update(id, { notes }),
    onSuccess: () => {
      invalidate();
      toast.success("تم حفظ الملاحظات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: api.orgNodes.remove,
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف الوحدة وفروعها");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = nodes.data ?? [];
  const roots = all.filter((n) => !n.parent_id);

  const openNew = (parentId: string | null) => {
    setForm({ title: "", person: "", department: "", notes: "", parent_id: parentId });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">الهيكل التنظيمي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            شجرة تفاعلية للوحدات الإدارية، مع ملاحظات قابلة للتوسيع والحفظ لكل وحدة.
          </p>
        </div>
        <Button onClick={() => openNew(null)}>
          <Plus className="size-4" /> وحدة رئيسية جديدة
        </Button>
      </header>

      <div className="panel overflow-x-auto p-6">
        <div className="flex min-w-max flex-col items-center gap-8">
          {roots.map((root) => (
            <NodeBranch
              key={root.id}
              node={root}
              all={all}
              onAddChild={openNew}
              onEdit={(n) => {
                setForm(n);
                setOpen(true);
              }}
              onDelete={(n) => {
                if (confirm(`حذف "${n.title}" وكل الوحدات التابعة له؟`)) remove.mutate(n.id);
              }}
              onSaveNotes={(id, notes) => saveNotes.mutate({ id, notes })}
            />
          ))}
          {!roots.length && (
            <p className="py-16 text-sm text-muted-foreground">
              لا توجد وحدات بعد. ابدأ بإضافة وحدة رئيسية.
            </p>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل الوحدة" : "إضافة وحدة تنظيمية"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>اسم الوحدة / المنصب</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: إدارة التسويق"
              />
            </div>
            <div>
              <Label>الشخص المسؤول</Label>
              <Input
                value={form.person ?? ""}
                onChange={(e) => setForm({ ...form, person: e.target.value })}
                placeholder="اسم المسؤول"
              />
            </div>
            <div>
              <Label>القسم</Label>
              <Input
                value={form.department ?? ""}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="القسم التابع له"
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="شرح مهام هذه الوحدة..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={!form.title?.trim() || save.isPending} onClick={() => save.mutate(form)}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NodeBranch({
  node,
  all,
  onAddChild,
  onEdit,
  onDelete,
  onSaveNotes,
}: {
  node: OrgNode;
  all: OrgNode[];
  onAddChild: (parentId: string) => void;
  onEdit: (n: OrgNode) => void;
  onDelete: (n: OrgNode) => void;
  onSaveNotes: (id: string, notes: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const children = all.filter((n) => n.parent_id === node.id);

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        childCount={children.length}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onAddChild={() => onAddChild(node.id)}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node)}
        onSaveNotes={(notes) => onSaveNotes(node.id, notes)}
      />

      {!!children.length && !collapsed && (
        <>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-start gap-8">
            {children.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {children.length > 1 && (
                  <span
                    className="absolute top-0 h-px bg-border"
                    style={{
                      right: i === 0 ? "50%" : 0,
                      left: i === children.length - 1 ? "50%" : 0,
                    }}
                  />
                )}
                <div className="h-8 w-px bg-border" />
                <NodeBranch
                  node={child}
                  all={all}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSaveNotes={onSaveNotes}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NodeCard({
  node,
  childCount,
  collapsed,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
  onSaveNotes,
}: {
  node: OrgNode;
  childCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [draft, setDraft] = useState(node.notes);

  return (
    <div className="w-72 rounded-2xl border bg-card p-4 shadow-panel transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{node.title}</p>
          {node.person && <p className="truncate text-xs text-muted-foreground">{node.person}</p>}
          {node.department && (
            <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {node.department}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button size="icon" variant="ghost" className="size-7" onClick={onEdit} aria-label="تعديل">
            <Pencil className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={onDelete} aria-label="حذف">
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={onAddChild}>
          <Plus className="size-3" /> وحدة فرعية
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setShowNotes((s) => !s)}
        >
          <MessageSquareText className="size-3" /> الملاحظات
        </Button>
        {childCount > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onToggle}>
            {collapsed ? <ChevronLeft className="size-3" /> : <ChevronDown className="size-3" />}
            {childCount}
          </Button>
        )}
      </div>

      {showNotes && (
        <div className="mt-3 rounded-xl bg-muted/60 p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="اكتب شرحاً أو ملاحظة خاصة بهذه الوحدة..."
            className="min-h-20 bg-background text-xs"
          />
          <Button size="sm" className="mt-2 h-7 w-full text-xs" onClick={() => onSaveNotes(draft)}>
            حفظ الملاحظة
          </Button>
        </div>
      )}
    </div>
  );
}
