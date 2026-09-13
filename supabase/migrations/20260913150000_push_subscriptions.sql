-- تخزين اشتراكات Web Push لكل جهاز، لإرسال إشعارات وأنت خارج التطبيق.
-- يُستخدم لاحقاً من Edge Function مجدولة (يتطلب مفاتيح VAPID ونشراً على HTTPS).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_open" on public.push_subscriptions;
create policy "push_subscriptions_open" on public.push_subscriptions
  for all to anon, authenticated using (true) with check (true);
