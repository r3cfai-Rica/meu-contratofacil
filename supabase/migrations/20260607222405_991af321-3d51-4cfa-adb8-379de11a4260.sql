-- Admin: delete any client (bypasses owner-only RLS) and cascades related invoices/contracts
CREATE OR REPLACE FUNCTION public.admin_delete_client(_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  -- Remove dependents first (invoices reference contracts; contracts reference clients)
  DELETE FROM public.invoice_reminders WHERE invoice_id IN (
    SELECT id FROM public.invoices WHERE client_id = _client_id
  );
  DELETE FROM public.invoices WHERE client_id = _client_id;
  DELETE FROM public.contract_history WHERE contract_id IN (
    SELECT id FROM public.contracts WHERE client_id = _client_id
  );
  DELETE FROM public.contracts WHERE client_id = _client_id;
  DELETE FROM public.clients WHERE id = _client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_client(uuid) TO authenticated;