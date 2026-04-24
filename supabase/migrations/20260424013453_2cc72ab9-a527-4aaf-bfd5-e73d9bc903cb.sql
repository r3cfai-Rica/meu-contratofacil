-- Enum for invoice status
CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Enum for PIX key type
CREATE TYPE public.pix_key_type AS ENUM ('cpf', 'cnpj', 'email', 'phone', 'random');

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  contract_id UUID,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  installment_number INTEGER,
  installment_total INTEGER,
  recurrence_group UUID,
  public_token UUID DEFAULT gen_random_uuid(),
  paid_at TIMESTAMPTZ,
  payment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_public_token ON public.invoices(public_token);
CREATE INDEX idx_invoices_status ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view invoice by token"
  ON public.invoices FOR SELECT
  USING (public_token IS NOT NULL);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PIX settings table (one per user)
CREATE TABLE public.pix_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pix_key TEXT NOT NULL,
  key_type public.pix_key_type NOT NULL,
  beneficiary_name TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pix settings"
  ON public.pix_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pix settings"
  ON public.pix_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pix settings"
  ON public.pix_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pix settings"
  ON public.pix_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Allow public payment page to fetch beneficiary PIX info via invoice user_id
CREATE POLICY "Public can view pix settings via invoice token"
  ON public.pix_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.user_id = pix_settings.user_id
        AND i.public_token IS NOT NULL
    )
  );

CREATE TRIGGER update_pix_settings_updated_at
  BEFORE UPDATE ON public.pix_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();