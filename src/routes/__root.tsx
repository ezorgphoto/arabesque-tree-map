import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
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
} from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/NotificationBell";

const NAV = [
  { to: "/", label: "لوحة القيادة", icon: LayoutDashboard },
  { to: "/hierarchy", label: "الهيكل التنظيمي", icon: Network },
  { to: "/employees", label: "الموظفون", icon: Users },
  { to: "/tasks", label: "المهام", icon: KanbanSquare },
  { to: "/planner", label: "المخطط الأسبوعي", icon: CalendarRange },
  { to: "/reports", label: "مركز التقارير", icon: FileBarChart2 },
  { to: "/map", label: "خريطة الفروع", icon: MapPin },
  { to: "/assistant", label: "المساعد الذكي", icon: BrainCircuit },
];

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
          {NAV.map((item) => (
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
        <p className="mt-auto text-xs text-sidebar-foreground/50">إصدار تجريبي — بيانات مباشرة</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur md:px-8">
          <p className="text-sm font-bold text-muted-foreground">نظام الإدارة التنفيذية</p>
          <NotificationBell />
        </header>
        <nav className="flex gap-1 overflow-x-auto bg-sidebar p-2 md:hidden">
          {NAV.map((item) => (
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
      <Toaster position="top-center" richColors dir="rtl" />
    </QueryClientProvider>
  );
}
