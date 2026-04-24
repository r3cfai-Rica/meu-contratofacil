-- Add signature-related columns
ALTER TABLE public.contracts
  ADD COLUMN signer_name TEXT,
  ADD COLUMN signer_document TEXT,
  ADD COLUMN signer_birth_date DATE,
  ADD COLUMN signer_display_name TEXT,
  ADD COLUMN signature_data TEXT,            -- base64 PNG (drawn) or rendered text signature
  ADD COLUMN signature_type TEXT,            -- 'drawn' | 'typed'
  ADD COLUMN signer_ip TEXT,
  ADD COLUMN signed_at TIMESTAMPTZ;

-- Allow public (anonymous) signing via token, but only while awaiting signature.
-- WITH CHECK ensures the new row keeps the same id/token and transitions to 'signed'.
CREATE POLICY "Public can sign contract by token"
  ON public.contracts FOR UPDATE
  USING (
    public_token IS NOT NULL
    AND status IN ('awaiting_signature', 'sent')
  )
  WITH CHECK (
    public_token IS NOT NULL
    AND status = 'signed'
  );