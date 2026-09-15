import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Network,
  Users,
  KanbanSquare,
  MapPin,
  Building2,
  FileBarChart2,
  CalendarRange,
  BrainCircuit,
  NotebookPen,
  LogOut,
} from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { AuthProvider, ROLE_LABEL, useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "لوحة القيادة", icon: LayoutDashboard, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/hierarchy", label: "الهيكل التنظيمي", icon: Network, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/employees", label: "الأعضاء", icon: Users, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/tasks", label: "المهام", icon: KanbanSquare, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/planner", label: "المخطط الزمني", icon: CalendarRange, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/reports", label: "مركز التقارير", icon: FileBarChart2, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/map", label: "خريطة الفروع", icon: MapPin, roles: ["manager", "deputy"] },
  { to: "/notes", label: "الملاحظات", icon: NotebookPen, roles: ["manager", "deputy"] },
  { to: "/assistant", label: "المساعد الذكي", icon: BrainCircuit, roles: ["manager", "deputy"] },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير متاحة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">تعذّر تحميل هذه الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">حدث خطأ ما، يمكنك المحاولة مرة أخرى.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "نظام الإدارة التنفيذية" },
      { name: "description", content: "منصة إدارة تنفيذية متكاملة للفروع والموظفين والمهام." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0f766e" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "الإدارة التنفيذية" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Shell() {
  const { profile, role, signOut } = useAuth();
  const items = NAV.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight">نظام الإدارة</p>
            <p className="text-xs text-sidebar-foreground/60">التنفيذية</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-sidebar-foreground/70">
          <p className="font-bold text-sidebar-foreground">{profile?.full_name}</p>
          <p>{role ? ROLE_LABEL[role] : ""}</p>
          <p>{profile?.org_unit || profile?.department || profile?.job_title}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1 pt-2 font-semibold text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <LogOut className="size-3.5" /> خروج
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur md:px-8">
          <p className="truncate text-sm font-bold text-muted-foreground">
            {profile?.full_name} — {role ? ROLE_LABEL[role] : "نظام الإدارة التنفيذية"}
          </p>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground md:hidden"
              onClick={() => void signOut()}
            >
              خروج
            </button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto bg-sidebar p-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-sidebar-foreground/75"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function UnlinkedAccount() {
  const { signOut } = useAuth();
  return (
    <div className="mx-auto max-w-md space-y-3 p-8 text-center">
      <h1 className="text-xl font-extrabold">الحساب غير مربوط بموظف</h1>
      <p className="text-sm text-muted-foreground">
        اطلب من مسؤول العمل إدخال نفس بريدك في بطاقة الموظف ثم أنشئ الحساب من جديد.
      </p>
      <button type="button" className="text-sm font-semibold text-primary" onClick={() => void signOut()}>
        خروج
      </button>
    </div>
  );
}

function AuthGate() {
  const { loading, session, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        جارٍ التحقق من الجلسة…
      </div>
    );
  }
  if (!session && !isLogin) return <Navigate to="/login" />;
  if (session && isLogin) return <Navigate to="/" />;
  if (!session && isLogin) return <Outlet />;
  if (session && !profile) {
    return (
      <UnlinkedAccount />
    );
  }
  return <Shell />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
        <Toaster position="top-center" richColors dir="rtl" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
