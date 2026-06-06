-- 1) Remove user-facing INSERT on subscriptions. The handle_new_user_subscription
--    trigger and Stripe webhook both use SECURITY DEFINER / service_role and
--    bypass RLS, so they continue to work.
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

CREATE POLICY "Deny user inserts on subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2) Prevent users from mutating Stripe Connect fields on their own profile.
--    A BEFORE UPDATE trigger silently reverts any change to those fields
--    unless the change is performed by the service role (Stripe webhook).
CREATE OR REPLACE FUNCTION public.protect_profile_stripe_connect_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.stripe_connect_account_id := OLD.stripe_connect_account_id;
    NEW.stripe_connect_charges_enabled := OLD.stripe_connect_charges_enabled;
    NEW.stripe_connect_payouts_enabled := OLD.stripe_connect_payouts_enabled;
    NEW.stripe_connect_onboarded_at := OLD.stripe_connect_onboarded_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_stripe_connect ON public.profiles;
CREATE TRIGGER profiles_protect_stripe_connect
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_stripe_connect_fields();