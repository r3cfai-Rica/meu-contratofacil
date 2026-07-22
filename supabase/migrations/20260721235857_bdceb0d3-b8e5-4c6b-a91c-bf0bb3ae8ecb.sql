
-- 1. Add 'viewer' to app_role enum (safe if already exists)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Read-only admin gate: admin OR viewer
CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text IN ('admin','viewer')
  )
$$;

-- 3. Read-only RPCs now accept viewer as well
CREATE OR REPLACE FUNCTION public.get_admin_overview()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE result JSONB;
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'free_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan='free' AND status IN ('active','trialing')),
    'pro_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan='pro' AND status IN ('active','trialing')),
    'business_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan='business' AND status IN ('active','trialing')),
    'paying_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan IN ('pro','business') AND status IN ('active','trialing')),
    'canceled_users', (SELECT COUNT(*) FROM public.subscriptions WHERE status='canceled'),
    'past_due_users', (SELECT COUNT(*) FROM public.subscriptions WHERE status='past_due'),
    'cancel_scheduled', (SELECT COUNT(*) FROM public.subscriptions WHERE cancel_at_period_end=true),
    'mrr_cents', (SELECT COALESCE(SUM(CASE WHEN plan='pro' THEN 4900 WHEN plan='business' THEN 9900 ELSE 0 END),0)
                  FROM public.subscriptions WHERE plan IN ('pro','business') AND status IN ('active','trialing')),
    'total_contracts', (SELECT COUNT(*) FROM public.contracts),
    'total_clients', (SELECT COUNT(*) FROM public.clients),
    'total_invoices', (SELECT COUNT(*) FROM public.invoices),
    'paid_invoices', (SELECT COUNT(*) FROM public.invoices WHERE status='paid'),
    'overdue_invoices', (SELECT COUNT(*) FROM public.invoices WHERE status='pending' AND due_date < CURRENT_DATE),
    'total_revenue_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE status='paid'),
    'revenue_30d_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE status='paid' AND paid_at >= now() - INTERVAL '30 days'),
    'signups_last_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - INTERVAL '7 days'),
    'signups_last_30d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - INTERVAL '30 days'),
    'team_invites_pending', (SELECT COUNT(*) FROM public.team_members WHERE status='pending'),
    'team_invites_accepted', (SELECT COUNT(*) FROM public.team_members WHERE status='accepted')
  ) INTO result;
  RETURN result;
END; $function$;

CREATE OR REPLACE FUNCTION public.list_admin_users()
 RETURNS TABLE(user_id uuid, email text, full_name text, account_type account_type, plan plan_tier, subscription_status subscription_status, current_period_end timestamp with time zone, signed_up_at timestamp with time zone, contracts_count integer, clients_count integer, invoices_count integer, is_admin boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::TEXT, COALESCE(p.full_name,''),
    COALESCE(p.account_type,'autonomo'::account_type),
    COALESCE(s.plan,'free'::plan_tier),
    COALESCE(s.status,'active'::subscription_status),
    s.current_period_end, u.created_at,
    (SELECT COUNT(*)::INTEGER FROM public.contracts c WHERE c.user_id=u.id),
    (SELECT COUNT(*)::INTEGER FROM public.clients cl WHERE cl.user_id=u.id),
    (SELECT COUNT(*)::INTEGER FROM public.invoices iv WHERE iv.user_id=u.id),
    public.has_role(u.id,'admin')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id=u.id
  LEFT JOIN public.subscriptions s ON s.user_id=u.id
  ORDER BY u.created_at DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.list_admin_recent_payments(_limit integer DEFAULT 20)
 RETURNS TABLE(invoice_id uuid, paid_at timestamp with time zone, amount_cents bigint, description text, user_email text, client_name text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT i.id, i.paid_at, (i.amount*100)::BIGINT, i.description,
         u.email::TEXT, COALESCE(c.full_name,'')
  FROM public.invoices i
  LEFT JOIN auth.users u ON u.id=i.user_id
  LEFT JOIN public.clients c ON c.id=i.client_id
  WHERE i.status='paid'
  ORDER BY i.paid_at DESC NULLS LAST
  LIMIT _limit;
END; $function$;

CREATE OR REPLACE FUNCTION public.list_admin_audit_logs(_limit integer DEFAULT 50)
 RETURNS SETOF audit_logs LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT _limit;
END; $function$;

CREATE OR REPLACE FUNCTION public.list_admin_clients(_limit integer DEFAULT 500)
 RETURNS TABLE(client_id uuid, full_name text, email text, phone text, document text, status client_status, created_at timestamp with time zone, owner_user_id uuid, owner_email text, owner_name text, owner_plan plan_tier, contracts_count integer, invoices_count integer, total_paid_cents bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT c.id, c.full_name, c.email, c.phone, c.document, c.status, c.created_at,
    c.user_id, u.email::TEXT, COALESCE(p.full_name,''),
    COALESCE(s.plan,'free'::plan_tier),
    (SELECT COUNT(*)::INTEGER FROM public.contracts ct WHERE ct.client_id=c.id),
    (SELECT COUNT(*)::INTEGER FROM public.invoices iv WHERE iv.client_id=c.id),
    (SELECT COALESCE(SUM(iv.amount*100),0)::BIGINT FROM public.invoices iv WHERE iv.client_id=c.id AND iv.status='paid')
  FROM public.clients c
  LEFT JOIN auth.users u ON u.id=c.user_id
  LEFT JOIN public.profiles p ON p.user_id=c.user_id
  LEFT JOIN public.subscriptions s ON s.user_id=c.user_id
  ORDER BY c.created_at DESC LIMIT _limit;
END; $function$;

CREATE OR REPLACE FUNCTION public.list_admin_contracts(_limit integer DEFAULT 500)
 RETURNS TABLE(contract_id uuid, contract_number text, title text, service_type text, total_value numeric, status contract_status, start_date date, created_at timestamp with time zone, client_name text, owner_user_id uuid, owner_email text, owner_name text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT c.id, c.contract_number, c.title, c.service_type, c.total_value, c.status, c.start_date, c.created_at,
    COALESCE(cl.full_name,''), c.user_id, u.email::TEXT, COALESCE(p.full_name,'')
  FROM public.contracts c
  LEFT JOIN public.clients cl ON cl.id=c.client_id
  LEFT JOIN auth.users u ON u.id=c.user_id
  LEFT JOIN public.profiles p ON p.user_id=c.user_id
  ORDER BY c.created_at DESC LIMIT _limit;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_get_client_details(_client_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT jsonb_build_object(
    'client', to_jsonb(c.*),
    'owner', jsonb_build_object(
      'user_id', u.id, 'email', u.email,
      'full_name', COALESCE(p.full_name,''),
      'plan', COALESCE(s.plan::text,'free'),
      'subscription_status', COALESCE(s.status::text,'active')),
    'contracts_count', (SELECT COUNT(*) FROM public.contracts WHERE client_id=c.id),
    'invoices_count', (SELECT COUNT(*) FROM public.invoices WHERE client_id=c.id),
    'total_paid_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE client_id=c.id AND status='paid'),
    'pending_invoices_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE client_id=c.id AND status='pending'),
    'recent_invoices', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'description',description,'amount',amount,'status',status,'due_date',due_date,'paid_at',paid_at) ORDER BY created_at DESC),'[]'::jsonb)
      FROM (SELECT * FROM public.invoices WHERE client_id=c.id ORDER BY created_at DESC LIMIT 10) i),
    'recent_contracts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'contract_number',contract_number,'title',title,'status',status,'total_value',total_value,'start_date',start_date) ORDER BY created_at DESC),'[]'::jsonb)
      FROM (SELECT * FROM public.contracts WHERE client_id=c.id ORDER BY created_at DESC LIMIT 10) ct)
  ) INTO result
  FROM public.clients c
  LEFT JOIN auth.users u ON u.id=c.user_id
  LEFT JOIN public.profiles p ON p.user_id=c.user_id
  LEFT JOIN public.subscriptions s ON s.user_id=c.user_id
  WHERE c.id=_client_id;
  RETURN result;
END; $function$;

-- 4. Admin-only: delete an invoice (with reminders)
CREATE OR REPLACE FUNCTION public.admin_delete_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado: apenas administradores'; END IF;
  DELETE FROM public.invoice_reminders WHERE invoice_id = _invoice_id;
  DELETE FROM public.invoices WHERE id = _invoice_id;
END; $$;

-- 5. Admin-only: set another user's role (admin/viewer/none)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado: apenas administradores'; END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode alterar seu próprio papel'; END IF;
  IF _role NOT IN ('admin','viewer','none') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','viewer');
  IF _role IN ('admin','viewer') THEN
    EXECUTE format('INSERT INTO public.user_roles(user_id, role) VALUES (%L, %L::public.app_role)', _user_id, _role);
  END IF;
END; $$;

-- 6. List admin/viewer roles so the panel can show badges
CREATE OR REPLACE FUNCTION public.list_admin_user_roles()
RETURNS TABLE(user_id uuid, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_access() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY SELECT ur.user_id, ur.role::text FROM public.user_roles ur
    WHERE ur.role::text IN ('admin','viewer');
END; $$;
