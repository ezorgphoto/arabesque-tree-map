import { Skeleton } from "@/components/ui/skeleton";

/** Full-screen RTL skeleton while auth session / profile hydrate */
export function AuthSessionSkeleton() {
  return (
    <div dir="rtl" className="flex min-h-screen bg-background">
      <aside className="hidden w-[15.25rem] shrink-0 border-s bg-sidebar p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </header>
        <main className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    </div>
  );
}
