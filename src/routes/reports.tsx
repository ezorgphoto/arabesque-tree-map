import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "مركز التقارير والعمليات | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "مركز موحّد لرفع تقارير الأقسام الديناميكية ومتابعة مؤشرات الأداء.",
      },
      { property: "og:title", content: "مركز التقارير والعمليات" },
      {
        property: "og:description",
        content: "مركز موحّد لرفع تقارير الأقسام الديناميكية ومتابعة مؤشرات الأداء.",
      },
    ],
  }),
  component: () => <Outlet />,
});
