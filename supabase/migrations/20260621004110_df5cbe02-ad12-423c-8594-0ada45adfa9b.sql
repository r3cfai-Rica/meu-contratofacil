
CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  -- Reminders -> invoices
  DELETE FROM public.invoice_reminders WHERE invoice_id IN (
    SELECT id FROM public.invoices WHERE user_id = _user_id
  );
  DELETE FROM public.invoices WHERE user_id = _user_id;

  -- Contract history -> contracts
  DELETE FROM public.contract_history WHERE contract_id IN (
    SELECT id FROM public.contracts WHERE user_id = _user_id
  );
  DELETE FROM public.contracts WHERE user_id = _user_id;

  DELETE FROM public.clients WHERE user_id = _user_id;
  DELETE FROM public.pix_settings WHERE user_id = _user_id;
  DELETE FROM public.payment_logs WHERE user_id = _user_id;
  DELETE FROM public.reviews WHERE user_id = _user_id;
  DELETE FROM public.team_members WHERE owner_id = _user_id OR member_user_id = _user_id;
  DELETE FROM public.subscriptions WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.audit_logs WHERE target_user_id = _user_id OR actor_id = _user_id;
  DELETE FROM public.profiles WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user_cascade(uuid) TO authenticated;
