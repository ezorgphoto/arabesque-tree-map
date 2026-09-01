import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { MapPin, Pencil, Plus, Trash2, Users, Wallet } from "lucide-react";
import { api, currency, type Branch } from "@/lib/api";
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

const BranchMap = lazy(() => import("@/components/BranchMap"));

export const Route = createFileRoute("/map")({
  component: MapPage,
  head: () => ({
    meta: [
      { title: "خريطة الفروع | نظام الإدارة التنفيذية" },
      { name: "description", content: "خريطة تفاعلية للفروع مع إضافة مواقع جديدة وبيانات لحظية." },
      { property: "og:title", content: "خريطة الفروع | نظام الإدارة التنفيذية" },
      {
        property: "og:description",
        content: "خريطة تفاعلية للفروع مع إضافة مواقع جديدة وبيانات لحظية.",
      },
    ],
  }),
});

const empty: Partial<Branch> = {
  name: "",
  city: "",
  manager: "",
  employees_count: 0,
  revenue: 0,
  notes: "",
  lat: 24.7136,
  lng: 46.6753,
};

function MapPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Branch>>(empty);
  const [selected, setSelected] = useState<Branch | null>(null);

  const branches = useQuery({ queryKey: ["branches"], queryFn: api.branches.list });
  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["branches"] });

  const save = useMutation({
    mutationFn: async (payload: Partial<Branch>) => {
      const { id, created_at, ...rest } = payload;
      return id ? api.branches.update(id, rest) : api.branches.create(rest);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("تم حفظ بيانات الفرع");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: api.branches.remove,
    onSuccess: () => {
      invalidate();
      setSelected(null);
      toast.success("تم حذف الفرع");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = branches.data ?? [];
  const staffCount = (id: string) =>
    (employees.data ?? []).filter((e) => e.branch_id === id).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">خريطة الفروع</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            انقر على أي مكان في الخريطة لإضافة فرع جديد، أو اختر دبوساً لعرض بياناته.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(empty);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> إضافة فرع
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel h-[32rem] overflow-hidden p-0 lg:col-span-2">
          <ClientOnly fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">جارِ تحميل الخريطة...</div>}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  جارِ تحميل الخريطة...
                </div>
              }
            >
              <BranchMap
                branches={list}
                selectedId={selected?.id ?? null}
                onSelect={(b) => setSelected(b)}
                onPick={(lat, lng) => {
                  setForm({ ...empty, lat, lng });
                  setOpen(true);
                }}
              />
            </Suspense>
          </ClientOnly>
        </div>

        <div className="space-y-4">
          {selected ? (
            <div className="panel space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">{selected.name}</h2>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {selected.city}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setForm(selected);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`حذف الفرع ${selected.name}؟`)) remove.mutate(selected.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" /> الموظفون
                  </p>
                  <p className="text-lg font-bold">{staffCount(selected.id)}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wallet className="size-3" /> الإيرادات
                  </p>
                  <p className="text-lg font-bold">{currency(Number(selected.revenue))}</p>
                </div>
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">المدير: </span>
                {selected.manager || "—"}
              </p>
              {selected.notes && <p className="text-sm text-muted-foreground">{selected.notes}</p>}
            </div>
          ) : (
            <div className="panel p-5 text-sm text-muted-foreground">
              اختر فرعاً من القائمة أو من الخريطة لعرض تفاصيله.
            </div>
          )}

          <div className="panel divide-y p-2">
            {list.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className={`flex w-full items-center justify-between rounded-lg p-3 text-right transition-colors hover:bg-muted ${
                  selected?.id === b.id ? "bg-primary/10" : ""
                }`}
              >
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-muted-foreground">{b.city}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل الفرع" : "إضافة فرع جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>اسم الفرع</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="فرع الرياض"
              />
            </div>
            <div>
              <Label>المدينة</Label>
              <Input
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="الرياض"
              />
            </div>
            <div>
              <Label>مدير الفرع</Label>
              <Input
                value={form.manager ?? ""}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                placeholder="اسم المدير"
              />
            </div>
            <div>
              <Label>الإيرادات</Label>
              <Input
                type="number"
                value={String(form.revenue ?? 0)}
                onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>خط العرض</Label>
              <Input
                type="number"
                value={String(form.lat ?? 0)}
                onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>خط الطول</Label>
              <Input
                type="number"
                value={String(form.lng ?? 0)}
                onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="وصف الفرع ونطاق تغطيته"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={!form.name?.trim() || save.isPending} onClick={() => save.mutate(form)}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
