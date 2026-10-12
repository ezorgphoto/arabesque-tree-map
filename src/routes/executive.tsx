import { createFileRoute, Navigate } from "@tanstack/react-router";

import { ExecutiveDashboard } from "@/features/executive";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/executive")({
  component: ExecutivePage,
  head: () => ({
    meta: [
      { title: "القيادة التنفيذية | نظام الإدارة التنفيذية" },
      {
        name: "description",
        content: "لوحة الاعتماد والقرارات والتفويض الفوري للإدارة التنفيذية.",
      },
    ],
  }),
});

function ExecutivePage() {
  const { isLeadership } = useAuth();
  if (!isLeadership) return <Navigate to="/" />;
  return <ExecutiveDashboard live />;
}
