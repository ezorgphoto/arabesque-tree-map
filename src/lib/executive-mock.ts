import type { ExecutiveDecision, ExecutiveFeedItem, ExecutiveTask } from "@/lib/executive-types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400_000).toISOString();

export const MOCK_PROFILES = [
  {
    id: "u-exec",
    role: "executive" as const,
    full_name: "مسؤول الأسرة",
    avatar_url: null,
    department: "الإدارة التنفيذية",
  },
  {
    id: "u-sec",
    role: "secretary" as const,
    full_name: "أمانة المكتب",
    avatar_url: null,
    department: "السكرتارية",
  },
  {
    id: "u-tm1",
    role: "team_member" as const,
    full_name: "أحمد التقني",
    avatar_url: null,
    department: "التقني",
  },
  {
    id: "u-tm2",
    role: "team_member" as const,
    full_name: "سارة الإعلام",
    avatar_url: null,
    department: "الإعلام",
  },
];

export const MOCK_EXEC_TASKS: ExecutiveTask[] = [
  {
    id: "t1",
    title: "اعتماد خطة الحملة الدعوية للربع",
    description: "مراجعة الميزانية والجدول الزمني النهائي",
    status: "in_review",
    priority: "urgent",
    created_by: "u-sec",
    assigned_to: "u-exec",
    delegated_by: "u-sec",
    due_date: daysFromNow(1),
    reject_reason: "",
    created_at: hoursAgo(5),
    assignee_name: "مسؤول الأسرة",
  },
  {
    id: "t2",
    title: "تفويض متابعة فرع دمشق",
    description: "رفع تقرير أسبوعي عن الالتزام التشغيلي",
    status: "pending",
    priority: "high",
    created_by: "u-exec",
    assigned_to: "u-tm1",
    delegated_by: "u-exec",
    due_date: daysFromNow(3),
    reject_reason: "",
    created_at: hoursAgo(8),
    assignee_name: "أحمد التقني",
  },
  {
    id: "t3",
    title: "مراجعة مسودة القرار الداخلي للتوظيف",
    description: "التحقق من البنود القانونية قبل النشر",
    status: "in_review",
    priority: "high",
    created_by: "u-sec",
    assigned_to: "u-exec",
    delegated_by: "u-sec",
    due_date: daysFromNow(2),
    reject_reason: "",
    created_at: hoursAgo(12),
    assignee_name: "مسؤول الأسرة",
  },
  {
    id: "t4",
    title: "إعداد محتوى الإطلاق الإعلامي",
    description: "مسودة المنشورات والهوية البصرية",
    status: "pending",
    priority: "medium",
    created_by: "u-sec",
    assigned_to: "u-tm2",
    delegated_by: "u-sec",
    due_date: daysFromNow(5),
    reject_reason: "",
    created_at: hoursAgo(20),
    assignee_name: "سارة الإعلام",
  },
];

export const MOCK_DECISIONS: ExecutiveDecision[] = [
  {
    id: "d1",
    title: "اعتماد هيكل اللجان الجديد",
    content: "اعتماد الهيكل التنظيمي المحدّث للجان المركزية.",
    confidentiality_level: "internal",
    status: "draft",
    created_by: "u-exec",
    created_at: hoursAgo(2),
  },
  {
    id: "d2",
    title: "توجيه سري بشأن الموازنة الطارئة",
    content: "تفاصيل حساسة حول إعادة توزيع بنود الموازنة.",
    confidentiality_level: "top_secret",
    status: "draft",
    created_by: "u-exec",
    created_at: hoursAgo(4),
  },
  {
    id: "d3",
    title: "إعلان بدء برنامج التدريب الصيفي",
    content: "قرار منشور داخلياً لبدء التسجيل.",
    confidentiality_level: "public",
    status: "published",
    created_by: "u-exec",
    created_at: hoursAgo(30),
  },
];

export const MOCK_FEED: ExecutiveFeedItem[] = [
  {
    id: "f1",
    kind: "task",
    title: "أُنشئت مهمة للمراجعة",
    detail: "اعتماد خطة الحملة الدعوية للربع",
    actor: "أمانة المكتب",
    at: hoursAgo(1),
    icon: "bell",
  },
  {
    id: "f2",
    kind: "decision",
    title: "مسودة قرار جديدة",
    detail: "اعتماد هيكل اللجان الجديد",
    actor: "مسؤول الأسرة",
    at: hoursAgo(2),
    icon: "file",
  },
  {
    id: "f3",
    kind: "task",
    title: "تفويض مهمة ميدانية",
    detail: "متابعة فرع دمشق → أحمد التقني",
    actor: "مسؤول الأسرة",
    at: hoursAgo(8),
    icon: "user",
  },
  {
    id: "f4",
    kind: "system",
    title: "اكتمال مهمة إعلامية",
    detail: "محتوى الإطلاق — قيد التدقيق",
    actor: "سارة الإعلام",
    at: hoursAgo(15),
    icon: "check",
  },
];

export const MOCK_NEXT_MEETING_AT = daysFromNow(0.35);
