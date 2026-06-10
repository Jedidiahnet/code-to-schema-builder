-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'user');
create type public.plan_tier as enum ('basic', 'pro', 'elite', 'quantum');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'pending');

-- ============ UPDATED_AT HELPER ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  telegram_chat_id text,
  telegram_display_name text,
  public_code text unique,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ USER_ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ============ PUBLIC CODE GENERATOR ============
create or replace function public.gen_public_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_row boolean;
begin
  loop
    code := 'TG-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    select exists(select 1 from public.profiles where public_code = code) into exists_row;
    exit when not exists_row;
  end loop;
  return code;
end;
$$;

-- ============ SUBSCRIPTIONS ============
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan public.plan_tier not null,
  status public.subscription_status not null default 'pending',
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
-- Hide sensitive paystack columns from clients
revoke select (paystack_email_token, paystack_subscription_code, paystack_customer_code)
  on public.subscriptions from authenticated, anon;
alter table public.subscriptions enable row level security;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============ PAYMENTS ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paystack_reference text unique,
  amount_cents integer not null,
  currency text not null default 'GHS',
  status text not null,
  plan public.plan_tier,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create index payments_user_idx on public.payments(user_id, created_at desc);

-- ============ SIGNALS ============
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  timeframe text not null,
  decision text not null,
  confidence numeric not null,
  indicators jsonb not null default '{}'::jsonb,
  agents jsonb not null default '[]'::jsonb,
  outcome text,
  created_at timestamptz not null default now()
);
grant select, insert on public.signals to authenticated;
grant all on public.signals to service_role;
alter table public.signals enable row level security;
create index signals_user_idx on public.signals(user_id, created_at desc);

-- ============ DAILY USAGE ============
create table public.daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  analyses_count integer not null default 0,
  primary key (user_id, day)
);
grant select on public.daily_usage to authenticated;
grant all on public.daily_usage to service_role;
alter table public.daily_usage enable row level security;

-- ============ RLS POLICIES ============
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_admin_select" on public.profiles for select using (public.has_role(auth.uid(), 'admin'));
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_update" on public.profiles for update using (public.has_role(auth.uid(), 'admin'));
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);

create policy "user_roles_self_select" on public.user_roles for select using (auth.uid() = user_id);
create policy "user_roles_admin_select" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_write" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy user_roles_block_non_admin_writes on public.user_roles
  as restrictive for all to authenticated, anon
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "subscriptions_self_select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_admin_select" on public.subscriptions for select using (public.has_role(auth.uid(), 'admin'));
create policy "subscriptions_admin_write" on public.subscriptions for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "payments_self_select" on public.payments for select using (auth.uid() = user_id);
create policy "payments_admin_select" on public.payments for select using (public.has_role(auth.uid(), 'admin'));
create policy "payments_admin_write" on public.payments for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "signals_self_select" on public.signals for select using (auth.uid() = user_id);
create policy "signals_self_insert" on public.signals for insert with check (auth.uid() = user_id);
create policy "signals_admin_select" on public.signals for select using (public.has_role(auth.uid(), 'admin'));

create policy "daily_usage_self_select" on public.daily_usage for select using (auth.uid() = user_id);
create policy "daily_usage_admin_select" on public.daily_usage for select using (public.has_role(auth.uid(), 'admin'));

-- ============ AUTO PROFILE + FOUNDER ADMIN ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, public_code)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    public.gen_public_code()
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;

  if lower(new.email) = 'mimmico112@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ============ SUPPORT MESSAGES (one-shot contact form) ============
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 100),
  email text not null check (char_length(trim(email)) between 3 and 255),
  subject text not null check (char_length(trim(subject)) between 1 and 160),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  status text not null default 'new' check (status in ('new','open','closed')),
  created_at timestamptz not null default now()
);
grant insert on public.support_messages to anon, authenticated;
grant select, update, delete on public.support_messages to authenticated;
grant all on public.support_messages to service_role;
alter table public.support_messages enable row level security;
create policy "Anyone can send support messages" on public.support_messages
  for insert to anon, authenticated
  with check (
    char_length(trim(name)) between 1 and 100
    and char_length(trim(email)) between 3 and 255
    and char_length(trim(subject)) between 1 and 160
    and char_length(trim(message)) between 1 and 2000
    and status = 'new'
  );
create policy "Admins can view support messages" on public.support_messages for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Admins can update support messages" on public.support_messages for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins can delete support messages" on public.support_messages for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));
create index support_messages_created_at_idx on public.support_messages(created_at desc);
create index support_messages_status_idx on public.support_messages(status);

-- ============ LIVE SUPPORT CHAT ============
create table public.support_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  unread_admin int not null default 0,
  unread_user int not null default 0,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.support_chat_threads to authenticated;
grant all on public.support_chat_threads to service_role;
alter table public.support_chat_threads enable row level security;
create policy chat_threads_self on public.support_chat_threads for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy chat_threads_self_upsert on public.support_chat_threads for insert to authenticated
  with check (auth.uid() = user_id);
create policy chat_threads_self_update on public.support_chat_threads for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create trigger support_chat_threads_updated_at before update on public.support_chat_threads
  for each row execute function public.set_updated_at();

create table public.support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','admin')),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index support_chat_messages_thread_idx on public.support_chat_messages(thread_id, created_at);
grant select, insert on public.support_chat_messages to authenticated;
grant all on public.support_chat_messages to service_role;
alter table public.support_chat_messages enable row level security;
create policy chat_msgs_read on public.support_chat_messages for select to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.support_chat_threads t where t.id = thread_id and t.user_id = auth.uid())
  );
create policy chat_msgs_send on public.support_chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid() and (
      (sender_role = 'admin' and public.has_role(auth.uid(),'admin'))
      or (sender_role = 'user' and exists (
        select 1 from public.support_chat_threads t where t.id = thread_id and t.user_id = auth.uid()
      ))
    )
  );

alter publication supabase_realtime add table public.support_chat_messages;
alter publication supabase_realtime add table public.support_chat_threads;
alter table public.support_chat_messages replica identity full;
alter table public.support_chat_threads replica identity full;

-- ============ ADMIN PAYMENT PROVIDER TOGGLES ============
create table public.admin_payment_providers (
  provider text primary key,
  display_name text not null,
  enabled boolean not null default false,
  public_config jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz not null default now()
);
grant select on public.admin_payment_providers to authenticated;
grant all on public.admin_payment_providers to service_role;
alter table public.admin_payment_providers enable row level security;
create policy pp_read on public.admin_payment_providers for select to authenticated using (true);
create policy pp_admin_write on public.admin_payment_providers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger admin_payment_providers_updated_at before update on public.admin_payment_providers
  for each row execute function public.set_updated_at();

insert into public.admin_payment_providers (provider, display_name, enabled, notes) values
  ('paystack', 'Paystack', true, 'Live. Manage PAYSTACK_SECRET_KEY in Cloud secrets.'),
  ('stripe', 'Stripe', false, 'Scaffold — wire STRIPE_SECRET_KEY then implement checkout.'),
  ('paypal', 'PayPal', false, 'Scaffold — add PAYPAL_CLIENT_ID / PAYPAL_SECRET.'),
  ('crypto', 'Crypto (NOWPayments)', false, 'Scaffold — add NOWPAYMENTS_API_KEY.'),
  ('lemonsqueezy', 'Lemon Squeezy', false, 'Scaffold — add LEMONSQUEEZY_API_KEY.');