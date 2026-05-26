
-- 1) Drop over-permissive public policies
DROP POLICY IF EXISTS "Public can view contracts by token" ON public.contracts;
DROP POLICY IF EXISTS "Public can sign contract by token" ON public.contracts;
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.invoices;
DROP POLICY IF EXISTS "Public can view pix settings via invoice token" ON public.pix_settings;
DROP POLICY IF EXISTS "Public can view invite by token" ON public.team_members;
DROP POLICY IF EXISTS "Member can accept own invite" ON public.team_members;

-- 2) Token-gated read RPCs (SECURITY DEFINER, require the exact token value)

CREATE OR REPLACE FUNCTION public.get_contract_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF p_token IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'id', c.id,
    'contract_number', c.contract_number,
    'title', c.title,
    'service_type', c.service_type,
    'service_description', c.service_description,
    'total_value', c.total_value,
    'payment_method', c.payment_method,
    'start_date', c.start_date,
    'end_date', c.end_date,
    'clauses', c.clauses,
    'status', c.status,
    'client_id', c.client_id,
    'user_id', c.user_id,
    'signer_name', c.signer_name,
    'signer_document', c.signer_document,
    'signer_birth_date', c.signer_birth_date,
    'signer_display_name', c.signer_display_name,
    'signature_data', c.signature_data,
    'signature_type', c.signature_type,
    'signed_at', c.signed_at,
    'signer_ip', c.signer_ip,
    'clients', jsonb_build_object(
      'full_name', cl.full_name,
      'document', cl.document,
      'email', cl.email
    ),
    'provider', jsonb_build_object(
      'full_name', p.full_name,
      'logo_url', p.logo_url
    )
  ) INTO result
  FROM public.contracts c
  LEFT JOIN public.clients cl ON cl.id = c.client_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.public_token = p_token;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_contract_by_token(
  p_token uuid,
  p_signer_name text,
  p_signer_document text,
  p_signer_birth_date date,
  p_signer_display_name text,
  p_signature_data text,
  p_signature_type text,
  p_signer_ip text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated_id uuid;
BEGIN
  IF p_token IS NULL THEN RAISE EXCEPTION 'token required'; END IF;
  UPDATE public.contracts
  SET signer_name = p_signer_name,
      signer_document = p_signer_document,
      signer_birth_date = p_signer_birth_date,
      signer_display_name = p_signer_display_name,
      signature_data = p_signature_data,
      signature_type = p_signature_type,
      signer_ip = p_signer_ip,
      signed_at = now(),
      status = 'signed'
  WHERE public_token = p_token
    AND status IN ('awaiting_signature','sent')
  RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'Contract not found or not awaiting signature';
  END IF;
  RETURN public.get_contract_by_token(p_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF p_token IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'id', i.id,
    'description', i.description,
    'amount', i.amount,
    'currency', i.currency,
    'due_date', i.due_date,
    'status', i.status,
    'paid_at', i.paid_at,
    'user_id', i.user_id,
    'public_token', i.public_token,
    'clients', jsonb_build_object('full_name', cl.full_name),
    'provider', jsonb_build_object('full_name', p.full_name),
    'pix', CASE WHEN px.user_id IS NOT NULL THEN jsonb_build_object(
      'pix_key', px.pix_key,
      'beneficiary_name', px.beneficiary_name,
      'city', px.city
    ) ELSE NULL END
  ) INTO result
  FROM public.invoices i
  LEFT JOIN public.clients cl ON cl.id = i.client_id
  LEFT JOIN public.profiles p ON p.user_id = i.user_id
  LEFT JOIN public.pix_settings px ON px.user_id = i.user_id
  WHERE i.public_token = p_token;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF p_token IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'id', t.id,
    'email', t.email,
    'status', t.status,
    'owner_id', t.owner_id,
    'owner_name', p.full_name
  ) INTO result
  FROM public.team_members t
  LEFT JOIN public.profiles p ON p.user_id = t.owner_id
  WHERE t.invite_token = p_token;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_by_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_contract_by_token(uuid,text,text,date,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_invoice_by_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_team_invite_by_token(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_contract_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_by_token(uuid,text,text,date,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_invite_by_token(uuid) TO anon, authenticated;
