-- Subscriptions: column-level SELECT excluding paystack tokens
GRANT SELECT (
  id, user_id, plan, status, current_period_end, cancel_at_period_end,
  created_at, updated_at
) ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- User bots: column-level SELECT excluding bot_token
GRANT SELECT (
  id, owner_id, bot_username, display_name, price_cents, period_days,
  currency, revshare_pct, enabled, created_at, updated_at
) ON public.user_bots TO authenticated;
GRANT INSERT (
  owner_id, bot_username, display_name, price_cents, period_days,
  currency, revshare_pct, enabled
) ON public.user_bots TO authenticated;
GRANT UPDATE (
  bot_username, display_name, price_cents, period_days, currency,
  revshare_pct, enabled
) ON public.user_bots TO authenticated;
GRANT DELETE ON public.user_bots TO authenticated;
GRANT ALL ON public.user_bots TO service_role;

-- Belt & suspenders
REVOKE SELECT (paystack_customer_code, paystack_subscription_code, paystack_email_token)
  ON public.subscriptions FROM authenticated, anon;
REVOKE SELECT (bot_token), INSERT (bot_token), UPDATE (bot_token)
  ON public.user_bots FROM authenticated, anon;