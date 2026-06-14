
-- 1. subscriptions: hide paystack_* columns from authenticated reads
REVOKE SELECT (paystack_customer_code, paystack_subscription_code, paystack_email_token)
  ON public.subscriptions FROM authenticated;
REVOKE SELECT (paystack_customer_code, paystack_subscription_code, paystack_email_token)
  ON public.subscriptions FROM anon;

-- 2. user_bots: hide bot_token from any client read, and block client writes to it
REVOKE SELECT (bot_token) ON public.user_bots FROM authenticated;
REVOKE SELECT (bot_token) ON public.user_bots FROM anon;
REVOKE INSERT (bot_token), UPDATE (bot_token) ON public.user_bots FROM authenticated;
REVOKE INSERT (bot_token), UPDATE (bot_token) ON public.user_bots FROM anon;

-- 3. admin_payment_providers: restrict reads to admins only
DROP POLICY IF EXISTS "pp_read" ON public.admin_payment_providers;
CREATE POLICY "pp_admin_read" ON public.admin_payment_providers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
