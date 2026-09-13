import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NotebookPen, Pencil, Plus, Search, Trash2 } from "lucide-react";

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
  formatNoteDate,
  loadNotes,
  noteId,
  persistNotes,
  type Note,
} from "@/lib/notes";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
  head: () => ({
    meta: [
      { title: "الملاحظات | نظام الإدارة التنفيذية" },
      { name: "description", content: "مساحة لتدوين الملاحظات الشخصية وحفظها والرجوع إليها." },
      { property: "og:title", content: "الملاحظات | نظام الإدارة التنفيذية" },
      { property: "og:description", content: "مساحة لتدوين الملاحظات الشخصية وحفظها." },
    ],
  }),
});

const emptyNote = (): Partial<Note> => ({ title: "", content: "" });

function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Note>>(emptyNote());
  const [term, setTerm] = useState("");

  // التحميل من التخزين المحلي بعد التركيب (لتفادي اختلاف الترطيب مع SSR)
  useEffect(() => {
    setNotes(loadNotes());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) persistNotes(notes);
  }, [notes, ready]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updated_at - a.updated_at);
    if (!q) return sorted;
    return sorted.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(q));
  }, [notes, term]);

  const openNew = () => {
    setForm(emptyNote());
    setOpen(true);
  };

  const openEdit = (note: Note) => {
    setForm(note);
    setOpen(true);
  };

  const save = () => {
    const title = (form.title ?? "").trim();
    const content = (form.content ?? "").trim();
    if (!title && !content) {
      toast.error("اكتب عنواناً أو نصاً للملاحظة");
      return;
    }
    const now = Date.now();
    if (form.id) {
      setNotes((list) =>
        list.map((n) => (n.id === form.id ? { ...n, title, content, updated_at: now } : n)),
      );
      toast.success("تم تحديث الملاحظة");
    } else {
      setNotes((list) => [
        { id: noteId(), title: title || "بدون عنوان", content, updated_at: now },
        ...list,
      ]);
      toast.success("تم حفظ الملاحظة");
    }
    setOpen(false);
  };

  const remove = (id: string) => {
    if (!confirm("حذف هذه الملاحظة؟")) return;
    setNotes((list) => list.filter((n) => n.id !== id));
    toast.success("تم حذف الملاحظة");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">الملاحظات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مساحتك الشخصية لتدوين الأفكار والملاحظات وحفظها والرجوع إليها.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> ملاحظة جديدة
        </Button>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="ابحث في الملاحظات..."
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <NotebookPen className="size-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {notes.length === 0
              ? "لا توجد ملاحظات بعد. ابدأ بإضافة أول ملاحظة."
              : "لا توجد ملاحظات مطابقة لبحثك."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="panel group flex flex-col p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 truncate text-base font-bold">{note.title}</h2>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => openEdit(note)}
                    aria-label="تعديل"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => remove(note.id)}
                    aria-label="حذف"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {note.content && (
                <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {note.content}
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground/70">
                آخر تحديث: {formatNoteDate(note.updated_at)}
              </p>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل الملاحظة" : "ملاحظة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="note-title">العنوان</Label>
              <Input
                id="note-title"
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان الملاحظة"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="note-content">النص</Label>
              <Textarea
                id="note-content"
                value={form.content ?? ""}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="اكتب ملاحظتك هنا..."
                className="min-h-40"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
