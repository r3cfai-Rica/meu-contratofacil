
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'canceled';

CREATE OR REPLACE FUNCTION public.admin_update_client_status(_client_id uuid, _status public.client_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;
  UPDATE public.clients SET status = _status, updated_at = now() WHERE id = _client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_client_details(_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'client', to_jsonb(c.*),
    'owner', jsonb_build_object(
      'user_id', u.id,
      'email', u.email,
      'full_name', COALESCE(p.full_name, ''),
      'plan', COALESCE(s.plan::text, 'free'),
      'subscription_status', COALESCE(s.status::text, 'active')
    ),
    'contracts_count', (SELECT COUNT(*) FROM public.contracts WHERE client_id = c.id),
    'invoices_count', (SELECT COUNT(*) FROM public.invoices WHERE client_id = c.id),
    'total_paid_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE client_id = c.id AND status = 'paid'),
    'pending_invoices_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE client_id = c.id AND status = 'pending'),
    'recent_invoices', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'description', description, 'amount', amount,
        'status', status, 'due_date', due_date, 'paid_at', paid_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.invoices WHERE client_id = c.id ORDER BY created_at DESC LIMIT 10) i
    ),
    'recent_contracts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'contract_number', contract_number, 'title', title,
        'status', status, 'total_value', total_value, 'start_date', start_date
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.contracts WHERE client_id = c.id ORDER BY created_at DESC LIMIT 10) ct
    )
  ) INTO result
  FROM public.clients c
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.subscriptions s ON s.user_id = c.user_id
  WHERE c.id = _client_id;

  RETURN result;
END;
$$;
