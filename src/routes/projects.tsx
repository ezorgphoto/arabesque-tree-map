import { createFileRoute, Navigate } from "@tanstack/react-router";

/** عُمل الفريق نُقل إلى المخطط المشترك */
export const Route = createFileRoute("/projects")({
  component: () => <Navigate to="/planner" />,
  head: () => ({ meta: [{ title: "عمل الفريق | نظام الإدارة التنفيذية" }] }),
});
