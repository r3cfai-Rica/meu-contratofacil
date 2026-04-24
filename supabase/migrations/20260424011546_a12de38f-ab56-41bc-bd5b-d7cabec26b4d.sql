-- Enums
CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'awaiting_signature', 'signed', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('one_time', 'installments', 'recurring');

-- Sequence for human-friendly contract numbers
CREATE SEQUENCE public.contract_number_seq START 1;

-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  contract_number TEXT NOT NULL UNIQUE DEFAULT ('CT-' || LPAD(nextval('public.contract_number_seq')::text, 6, '0')),
  title TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_description TEXT,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'one_time',
  start_date DATE NOT NULL,
  end_date DATE,
  clauses TEXT,
  status public.contract_status NOT NULL DEFAULT 'draft',
  public_token UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.contract_number_seq OWNED BY public.contracts.contract_number;

CREATE INDEX idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_public_token ON public.contracts(public_token) WHERE public_token IS NOT NULL;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
  ON public.contracts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts"
  ON public.contracts FOR DELETE
  USING (auth.uid() = user_id);

-- Public access by token (for signature link)
CREATE POLICY "Public can view contracts by token"
  ON public.contracts FOR SELECT
  USING (public_token IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Contract history
CREATE TABLE public.contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_history_contract_id ON public.contract_history(contract_id);

ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of own contracts"
  ON public.contract_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_history.contract_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert history for own contracts"
  ON public.contract_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_history.contract_id AND c.user_id = auth.uid()
    )
  );

-- Trigger to log contract changes
CREATE OR REPLACE FUNCTION public.log_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contract_history (contract_id, user_id, action, details)
    VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.contract_history (contract_id, user_id, action, details)
      VALUES (NEW.id, NEW.user_id, 'status_changed',
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    ELSE
      INSERT INTO public.contract_history (contract_id, user_id, action, details)
      VALUES (NEW.id, NEW.user_id, 'updated', jsonb_build_object('status', NEW.status));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER contract_history_trigger
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contract_changes();