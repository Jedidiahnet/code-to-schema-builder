-- ============ ADMIN SECRETS (DB-backed API key store) ============
create table public.admin_secrets (
  key text primary key,
  value text not null,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.admin_secrets to authenticated;
grant all on public.admin_secrets to service_role;
alter table public.admin_secrets enable row level security;

create policy admin_secrets_admin_all on public.admin_secrets
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger admin_secrets_updated_at before update on public.admin_secrets
  for each row execute function public.set_updated_at();

-- Seed common keys so admin sees the list immediately (empty values)
insert into public.admin_secrets (key, value, description) values
  ('PAYSTACK_SECRET_KEY', '', 'Paystack live secret key for billing checkout & webhooks.'),
  ('PAYSTACK_PUBLIC_KEY', '', 'Paystack public key (safe to expose).'),
  ('TIINGO_API_KEY', '', 'Tiingo API key for live forex prices & charts.'),
  ('TELEGRAM_BOT_TOKEN', '', 'Telegram bot token for sending signal alerts.'),
  ('STRIPE_SECRET_KEY', '', 'Stripe secret key (when Stripe checkout is enabled).'),
  ('STRIPE_WEBHOOK_SECRET', '', 'Stripe webhook signing secret.'),
  ('PAYPAL_CLIENT_ID', '', 'PayPal REST client ID.'),
  ('PAYPAL_SECRET', '', 'PayPal REST client secret.'),
  ('NOWPAYMENTS_API_KEY', '', 'NOWPayments crypto checkout API key.'),
  ('LEMONSQUEEZY_API_KEY', '', 'Lemon Squeezy API key.')
on conflict (key) do nothing;

-- ============ AUDIT LOGS ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- Helper to log audit events (callable by service role only)
create or replace function public.log_audit(
  _actor_id uuid,
  _actor_email text,
  _action text,
  _target_type text,
  _target_id text,
  _details jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (actor_id, actor_email, action, target_type, target_id, details)
  values (_actor_id, _actor_email, _action, _target_type, _target_id, coalesce(_details, '{}'::jsonb))
$$;

revoke execute on function public.log_audit(uuid, text, text, text, text, jsonb) from public, anon, authenticated;