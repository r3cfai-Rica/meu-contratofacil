
-- Fix ambiguous user_id in list_admin_users
CREATE OR REPLACE FUNCTION public.list_admin_users()
 RETURNS TABLE(user_id uuid, email text, full_name text, account_type account_type, plan plan_tier, subscription_status subscription_status, current_period_end timestamp with time zone, signed_up_at timestamp with time zone, contracts_count integer, clients_count integer, invoices_count integer, is_admin boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::TEXT AS email,
    COALESCE(p.full_name, '') AS full_name,
    COALESCE(p.account_type, 'autonomo'::account_type) AS account_type,
    COALESCE(s.plan, 'free'::plan_tier) AS plan,
    COALESCE(s.status, 'active'::subscription_status) AS subscription_status,
    s.current_period_end,
    u.created_at AS signed_up_at,
    (SELECT COUNT(*)::INTEGER FROM public.contracts c WHERE c.user_id = u.id) AS contracts_count,
    (SELECT COUNT(*)::INTEGER FROM public.clients cl WHERE cl.user_id = u.id) AS clients_count,
    (SELECT COUNT(*)::INTEGER FROM public.invoices iv WHERE iv.user_id = u.id) AS invoices_count,
    public.has_role(u.id, 'admin') AS is_admin
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$function$;

-- New: list all clients across all owners (admin CRM)
CREATE OR REPLACE FUNCTION public.list_admin_clients(_limit integer DEFAULT 500)
 RETURNS TABLE(
   client_id uuid,
   full_name text,
   email text,
   phone text,
   document text,
   status client_status,
   created_at timestamp with time zone,
   owner_user_id uuid,
   owner_email text,
   owner_name text,
   owner_plan plan_tier,
   contracts_count integer,
   invoices_count integer,
   total_paid_cents bigint
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS client_id,
    c.full_name,
    c.email,
    c.phone,
    c.document,
    c.status,
    c.created_at,
    c.user_id AS owner_user_id,
    u.email::TEXT AS owner_email,
    COALESCE(p.full_name, '') AS owner_name,
    COALESCE(s.plan, 'free'::plan_tier) AS owner_plan,
    (SELECT COUNT(*)::INTEGER FROM public.contracts ct WHERE ct.client_id = c.id) AS contracts_count,
    (SELECT COUNT(*)::INTEGER FROM public.invoices iv WHERE iv.client_id = c.id) AS invoices_count,
    (SELECT COALESCE(SUM(iv.amount * 100), 0)::BIGINT FROM public.invoices iv WHERE iv.client_id = c.id AND iv.status = 'paid') AS total_paid_cents
  FROM public.clients c
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.subscriptions s ON s.user_id = c.user_id
  ORDER BY c.created_at DESC
  LIMIT _limit;
END;
$function$;
