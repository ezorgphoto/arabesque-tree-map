export type FieldType = "text" | "number" | "date" | "textarea" | "select";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
};

export type DepartmentDef = {
  key: string;
  label: string;
  fields: FieldDef[];
};

export const DEPARTMENTS: DepartmentDef[] = [
  {
    key: "advocacy",
    label: "المشاريع الدعوية",
    fields: [
      { key: "campaign_name", label: "اسم الحملة", type: "text", required: true },
      {
        key: "activity_nature",
        label: "طبيعة النشاط",
        type: "select",
        options: ["محاضرة", "ندوة", "ورشة عمل", "توزيع مطبوعات", "زيارة ميدانية", "أخرى"],
      },
      { key: "location", label: "المكان", type: "text" },
      {
        key: "completion_status",
        label: "حالة الإنجاز",
        type: "select",
        options: ["ناجح", "جزئي", "مؤجل", "ملغى"],
      },
      { key: "beneficiaries_count", label: "عدد المستفيدين", type: "number" },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  {
    key: "digital_media",
    label: "النشر الرقمي والإعلامي",
    fields: [
      {
        key: "platform",
        label: "المنصة",
        type: "select",
        options: ["فيسبوك", "تيليجرام", "واتساب"],
      },
      { key: "post_title", label: "عنوان المنشور", type: "text", required: true },
      { key: "content_type", label: "نوع المحتوى", type: "text" },
      {
        key: "interaction_level",
        label: "مستوى التفاعل",
        type: "select",
        options: ["ممتاز", "جيد جداً", "متوسط", "ضعيف"],
      },
      { key: "reach", label: "عدد المشاهدات / الوصول", type: "number" },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  {
    key: "service_projects",
    label: "المشاريع الخدمية",
    fields: [
      { key: "project_name", label: "اسم المشروع", type: "text", required: true },
      { key: "objective", label: "الهدف", type: "text" },
      {
        key: "completion_level",
        label: "نسبة الإنجاز",
        type: "select",
        options: ["لم يبدأ", "٢٥٪", "٥٠٪", "٧٥٪", "مكتمل"],
      },
      { key: "budget", label: "الميزانية / التكلفة", type: "number" },
      { key: "volunteers_count", label: "عدد المتطوعين", type: "number" },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  {
    key: "education_youth",
    label: "الدورات العلمية والشباب",
    fields: [
      { key: "student_name", label: "اسم الطالب", type: "text", required: true },
      { key: "age", label: "العمر", type: "number" },
      { key: "course_name", label: "اسم الكتاب / الدورة", type: "text" },
      { key: "attendance_percent", label: "نسبة الحضور ٪", type: "number" },
      { key: "supervisor_notes", label: "ملاحظات المشرف", type: "textarea" },
    ],
  },
  {
    key: "sports",
    label: "الرياضة البدنية",
    fields: [
      { key: "trainee_name", label: "اسم المتدرب", type: "text", required: true },
      {
        key: "level",
        label: "المستوى",
        type: "select",
        options: ["مبتدئ", "متوسط", "متقدم"],
      },
      { key: "commitment_percent", label: "نسبة الالتزام ٪", type: "number" },
      { key: "progress", label: "التطور والتحسينات", type: "textarea" },
    ],
  },
  {
    key: "video_production",
    label: "المونتاج والإنتاج المرئي",
    fields: [
      { key: "video_title", label: "عنوان الفيديو", type: "text", required: true },
      { key: "video_type", label: "نوع الفيديو", type: "text" },
      { key: "delivery_date", label: "تاريخ التسليم المتوقع", type: "date" },
      {
        key: "production_status",
        label: "حالة الإنتاج",
        type: "select",
        options: ["تحضير", "تصوير", "مونتاج", "مراجعة", "جاهز"],
      },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  {
    key: "camps",
    label: "المعسكرات والمسير الخلوي",
    fields: [
      { key: "participant_name", label: "اسم المشارك", type: "text", required: true },
      { key: "readiness_level", label: "مستوى الجاهزية", type: "text" },
      {
        key: "participation_status",
        label: "حالة المشاركة",
        type: "select",
        options: ["كاملة", "جزئية", "معتذر", "غائب"],
      },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
  },
  {
    key: "public_relations",
    label: "العلاقات العامة والتوسع",
    fields: [
      { key: "region", label: "المنطقة المستهدفة", type: "text", required: true },
      { key: "officer_name", label: "اسم مسؤول العلاقات", type: "text" },
      { key: "primary_goal", label: "الهدف الرئيسي", type: "text" },
      {
        key: "timeline",
        label: "الجدول الزمني",
        type: "select",
        options: ["الأسبوع ١-٢", "الأسبوع ٣-٤", "الأسبوع ٥-٦", "الأسبوع ٧-٨"],
      },
      { key: "status", label: "الحالة", type: "text" },
    ],
  },
  {
    key: "finance",
    label: "الإدارة المالية",
    fields: [
      { key: "total_inflow", label: "إجمالي الوارد", type: "number" },
      { key: "total_outflow", label: "إجمالي الصادر", type: "number" },
      { key: "net_balance", label: "صافي الرصيد", type: "number" },
      { key: "financial_notes", label: "ملاحظات مالية", type: "textarea" },
    ],
  },
];

export const DEPARTMENT_LABELS: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d.label]),
);

export function getDepartment(key: string): DepartmentDef | undefined {
  return DEPARTMENTS.find((d) => d.key === key);
}
