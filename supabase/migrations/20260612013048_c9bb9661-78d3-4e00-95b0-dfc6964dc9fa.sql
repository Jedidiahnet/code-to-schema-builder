
-- Per-user Telegram bots (Elite/Quantum = free, Pro = 8% revshare, Basic = no access)
CREATE TABLE public.user_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_username text,
  bot_token text NOT NULL,
  display_name text,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  period_days integer NOT NULL DEFAULT 30 CHECK (period_days > 0),
  currency text NOT NULL DEFAULT 'USD',
  revshare_pct numeric(5,2) NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bots TO authenticated;
GRANT ALL ON public.user_bots TO service_role;
ALTER TABLE public.user_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own bot" ON public.user_bots FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "admins read all bots" ON public.user_bots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_user_bots_updated BEFORE UPDATE ON public.user_bots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_bot_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.user_bots(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL,
  telegram_username text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','canceled')),
  expires_at timestamptz,
  paid_cents integer NOT NULL DEFAULT 0,
  owner_payout_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, telegram_user_id)
);
GRANT SELECT ON public.user_bot_subscribers TO authenticated;
GRANT ALL ON public.user_bot_subscribers TO service_role;
ALTER TABLE public.user_bot_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads own subs" ON public.user_bot_subscribers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_bots b WHERE b.id = bot_id AND b.owner_id = auth.uid()));
CREATE POLICY "admins read all subs" ON public.user_bot_subscribers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_user_bot_subs_updated BEFORE UPDATE ON public.user_bot_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_user_bot_subs_bot ON public.user_bot_subscribers(bot_id);
CREATE INDEX idx_user_bot_subs_status ON public.user_bot_subscribers(status);
