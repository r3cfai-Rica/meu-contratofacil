
-- Admin: delete any contract (cascades history + invoice links)
CREATE OR REPLACE FUNCTION public.admin_delete_contract(_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  DELETE FROM public.invoice_reminders WHERE invoice_id IN (
    SELECT id FROM public.invoices WHERE contract_id = _contract_id
  );
  UPDATE public.invoices SET contract_id = NULL WHERE contract_id = _contract_id;
  DELETE FROM public.contract_history WHERE contract_id = _contract_id;
  DELETE FROM public.contracts WHERE id = _contract_id;
END;
$$;

-- Admin: list all contracts with owner + client info
CREATE OR REPLACE FUNCTION public.list_admin_contracts(_limit integer DEFAULT 500)
RETURNS TABLE(
  contract_id uuid,
  contract_number text,
  title text,
  service_type text,
  total_value numeric,
  status contract_status,
  start_date date,
  created_at timestamptz,
  client_name text,
  owner_user_id uuid,
  owner_email text,
  owner_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    c.id,
    c.contract_number,
    c.title,
    c.service_type,
    c.total_value,
    c.status,
    c.start_date,
    c.created_at,
    COALESCE(cl.full_name, '') AS client_name,
    c.user_id,
    u.email::TEXT,
    COALESCE(p.full_name, '')
  FROM public.contracts c
  LEFT JOIN public.clients cl ON cl.id = c.client_id
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  ORDER BY c.created_at DESC
  LIMIT _limit;
END;
$$;
