
-- 1. Enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Convenience function for current user
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 5. RLS policies on user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Auto-assign admin role to ricaferrari@mac.com on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'ricaferrari@mac.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 7. If the user already exists, assign admin now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'ricaferrari@mac.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'free_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan = 'free' AND status IN ('active','trialing')),
    'pro_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan = 'pro' AND status IN ('active','trialing')),
    'business_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan = 'business' AND status IN ('active','trialing')),
    'paying_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan IN ('pro','business') AND status IN ('active','trialing')),
    'mrr_cents', (
      SELECT COALESCE(SUM(
        CASE
          WHEN plan = 'pro' THEN 4900
          WHEN plan = 'business' THEN 9900
          ELSE 0
        END
      ), 0)
      FROM public.subscriptions
      WHERE plan IN ('pro','business') AND status IN ('active','trialing')
    ),
    'total_contracts', (SELECT COUNT(*) FROM public.contracts),
    'total_clients', (SELECT COUNT(*) FROM public.clients),
    'total_invoices', (SELECT COUNT(*) FROM public.invoices),
    'total_revenue_cents', (
      SELECT COALESCE(SUM(amount * 100), 0)::BIGINT
      FROM public.invoices WHERE status = 'paid'
    ),
    'signups_last_30d', (
      SELECT COUNT(*) FROM auth.users
      WHERE created_at >= now() - INTERVAL '30 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 9. Admin user listing
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  account_type account_type,
  plan plan_tier,
  subscription_status subscription_status,
  current_period_end TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  contracts_count INTEGER,
  clients_count INTEGER,
  invoices_count INTEGER,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(p.full_name, ''),
    COALESCE(p.account_type, 'autonomo'::account_type),
    COALESCE(s.plan, 'free'::plan_tier),
    COALESCE(s.status, 'active'::subscription_status),
    s.current_period_end,
    u.created_at,
    (SELECT COUNT(*)::INTEGER FROM public.contracts WHERE user_id = u.id),
    (SELECT COUNT(*)::INTEGER FROM public.clients WHERE user_id = u.id),
    (SELECT COUNT(*)::INTEGER FROM public.invoices WHERE user_id = u.id),
    public.has_role(u.id, 'admin')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
