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
  Shield,
  FolderKanban,
} from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { AuthProvider, ROLE_LABEL, useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "لوحة القيادة", icon: LayoutDashboard, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/tasks", label: "مهامي", icon: KanbanSquare, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/projects", label: "عمل الفريق", icon: FolderKanban, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/planner", label: "المخطط المشترك", icon: CalendarRange, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/employees", label: "الزملاء", icon: Users, roles: ["manager", "deputy", "supervisor", "member"] },
  { to: "/hierarchy", label: "الهيكل التنظيمي", icon: Network, roles: ["manager", "deputy"] },
  { to: "/reports", label: "مركز التقارير", icon: FileBarChart2, roles: ["manager", "deputy"] },
  { to: "/permissions", label: "الصلاحيات", icon: Shield, roles: ["manager"] },
  { to: "/map", label: "خريطة الفروع", icon: MapPin, roles: ["manager", "deputy"] },
  { to: "/notes", label: "الملاحظات", icon: NotebookPen, roles: ["manager", "deputy"] },
  { to: "/assistant", label: "المساعد الذكي", icon: BrainCircuit, roles: ["manager", "deputy"] },
] as const;

const NAV_GROUPS = [
  { title: "يومي", paths: ["/", "/tasks", "/projects", "/planner"] },
  { title: "الناس", paths: ["/employees", "/hierarchy"] },
  { title: "إدارة", paths: ["/reports", "/permissions", "/map", "/notes", "/assistant"] },
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
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full">
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
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden h-full w-[15.25rem] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight">نظام الإدارة</p>
            <p className="text-[11px] text-sidebar-foreground/55">التنفيذية</p>
          </div>
        </div>
        <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-2 pb-3">
          {NAV_GROUPS.map((group) => {
            const groupItems = items.filter((item) =>
              (group.paths as readonly string[]).includes(item.to),
            );
            if (!groupItems.length) return null;
            return (
              <div key={group.title} className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-bold text-sidebar-foreground/40">
                  {group.title}
                </p>
                {groupItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{
                      className:
                        "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mx-3 mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-3.5" /> خروج
        </button>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{profile?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {role ? ROLE_LABEL[role] : ""}
              {profile?.org_unit || profile?.department
                ? ` · ${profile?.org_unit || profile?.department}`
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
        <nav className="no-scrollbar grid shrink-0 grid-cols-3 gap-1 border-b bg-card p-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="truncate rounded-md px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
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
  if (session && !profile) return <UnlinkedAccount />;
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
