// ملاحظات شخصية محفوظة محلياً في المتصفح (localStorage).
// ملاحظة: التخزين محلي لكل جهاز؛ للمزامنة عبر الأجهزة يلزم جدول في Supabase لاحقاً.

export type Note = {
  id: string;
  title: string;
  content: string;
  updated_at: number;
};

const STORAGE_KEY = "exec_notes_v1";

export const noteId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // تجاهل أخطاء التخزين (مثل امتلاء المساحة)
  }
}

export const formatNoteDate = (ts: number): string =>
  new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
