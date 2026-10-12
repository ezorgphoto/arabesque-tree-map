import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";

import { api, STATUSES, type Employee } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getMbti } from "@/lib/mbti";
import { parseTagList } from "@/lib/profile-tags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/recruitment")({
  component: RecruitmentPage,
  head: () => ({
    meta: [
      { title: "تقرير الاستقطاب | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "تحليل شخصيات الزملاء والحالات والمستويات ضمن متابعة الاستقطاب.",
      },
    ],
  }),
});

function RecruitmentPage() {
  const { isLeadership } = useAuth();
  const employees = useQuery({ queryKey: ["employees"], queryFn: api.employees.list });
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [mbtiOnly, setMbtiOnly] = useState<"all" | "yes" | "no">("all");
  const [hasProblems, setHasProblems] = useState<"all" | "yes" | "no">("all");

  const rows = useMemo(() => {
    let list = employees.data ?? [];
    const q = term.trim();
    if (q) {
      list = list.filter((e) =>
        [e.full_name, e.org_unit, e.department, e.studies, e.sharia_program, e.personality_type]
          .join(" ")
          .includes(q),
      );
    }
    if (status !== "all") list = list.filter((e) => e.status === status);
    if (mbtiOnly === "yes") list = list.filter((e) => Boolean(getMbti(e.personality_type)));
    if (mbtiOnly === "no") list = list.filter((e) => !getMbti(e.personality_type));
    if (hasProblems === "yes") list = list.filter((e) => parseTagList(e.problems).length > 0);
    if (hasProblems === "no") list = list.filter((e) => parseTagList(e.problems).length === 0);
    return list;
  }, [employees.data, term, status, mbtiOnly, hasProblems]);

  const stats = useMemo(() => {
    const all = employees.data ?? [];
    return {
      total: all.length,
      active: all.filter((e) => e.status === "active").length,
      vacation: all.filter((e) => e.status === "vacation").length,
      suspended: all.filter((e) => e.status === "suspended").length,
      withProblems: all.filter((e) => parseTagList(e.problems).length > 0).length,
      withMbti: all.filter((e) => Boolean(getMbti(e.personality_type))).length,
    };
  }, [employees.data]);

  if (!isLeadership) return <Navigate to="/" />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">تقرير الاستقطاب</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظرة على الشخصيات، الحالات (نشط / إجازة / موقوف)، المشاكل، والمستويات — لمتابعة الزملاء.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/employees">العودة للزملاء</Link>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["الإجمالي", stats.total],
          ["على رأس العمل", stats.active],
          ["إجازة", stats.vacation],
          ["موقوف", stats.suspended],
          ["لديهم مشاكل", stats.withProblems],
          ["نمط MBTI", stats.withMbti],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="بحث بالاسم أو القسم أو الدراسة…"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUSES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mbtiOnly} onValueChange={(v) => setMbtiOnly(v as typeof mbtiOnly)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">MBTI: الكل</SelectItem>
            <SelectItem value="yes">لديه نمط</SelectItem>
            <SelectItem value="no">بدون نمط</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hasProblems} onValueChange={(v) => setHasProblems(v as typeof hasProblems)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">المشاكل: الكل</SelectItem>
            <SelectItem value="yes">لديه مشاكل</SelectItem>
            <SelectItem value="no">بدون مشاكل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-right font-bold">الزميل</th>
              <th className="px-3 py-2 text-right font-bold">الحالة</th>
              <th className="px-3 py-2 text-right font-bold">الشخصية</th>
              <th className="px-3 py-2 text-right font-bold">المستويات</th>
              <th className="px-3 py-2 text-right font-bold">دراسة / عمل</th>
              <th className="px-3 py-2 text-right font-bold">برنامج شرعي</th>
              <th className="px-3 py-2 text-right font-bold">مشاكل</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((e) => (
              <RecruitmentRow key={e.id} e={e} />
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  لا نتائج مطابقة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecruitmentRow({ e }: { e: Employee }) {
  const mbti = getMbti(e.personality_type);
  const problems = parseTagList(e.problems);
  return (
    <tr className="align-top">
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
            {e.full_name.slice(0, 1)}
          </div>
          <div>
            <p className="font-extrabold">{e.full_name}</p>
            <p className="text-xs text-muted-foreground">{e.org_unit || e.department || "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge variant={e.status === "active" ? "default" : "secondary"}>
          {STATUSES[e.status] ?? e.status}
        </Badge>
      </td>
      <td className="px-3 py-3">
        {mbti ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold">
            <UserRound className="size-3.5" />
            {mbti.code} · {mbti.nameAr}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">غير محدد</span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        <div>فكري: {e.intellectual_level || "—"}</div>
        <div>شرعي: {e.religious_level || "—"}</div>
        <div>تدريبي: {e.training_level || "—"}</div>
      </td>
      <td className="px-3 py-3 text-xs">
        <div>{e.studies || "—"}</div>
        <div className="text-muted-foreground">
          {e.is_employed ? `يعمل: ${e.work_title || "نعم"}` : "لا يعمل"}
        </div>
      </td>
      <td className="px-3 py-3 text-xs">{e.sharia_program || "—"}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {problems.slice(0, 4).map((p) => (
            <Badge key={p} variant="outline" className="text-[10px]">
              {p}
            </Badge>
          ))}
          {!problems.length && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </td>
    </tr>
  );
}
