-- 1) profiles.country
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'BR';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_country_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_country_check CHECK (country IN ('BR','US'));

-- 2) Update handle_new_user to capture country
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, account_type, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'account_type')::public.account_type, 'autonomo'),
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'BR')
  );
  RETURN NEW;
END;
$function$;

-- 3) invoices: currency + stripe ids
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_currency_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_currency_check CHECK (currency IN ('BRL','USD'));

-- 4) payment_logs table
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  user_id uuid,
  provider text NOT NULL CHECK (provider IN ('stripe','pix')),
  event_type text NOT NULL,
  amount_cents bigint,
  currency text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_logs_invoice_id_idx ON public.payment_logs(invoice_id);
CREATE INDEX IF NOT EXISTS payment_logs_user_id_idx ON public.payment_logs(user_id);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own payment logs" ON public.payment_logs;
CREATE POLICY "Owners can view own payment logs"
  ON public.payment_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all payment logs" ON public.payment_logs;
CREATE POLICY "Admins can view all payment logs"
  ON public.payment_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
