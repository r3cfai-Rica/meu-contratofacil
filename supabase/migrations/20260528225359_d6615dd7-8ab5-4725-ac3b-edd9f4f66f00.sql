
-- invoice_reminders: restrict writes to invoice owner
CREATE POLICY "Owners can insert reminders"
ON public.invoice_reminders FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_reminders.invoice_id AND i.user_id = auth.uid()
));

CREATE POLICY "Owners can update reminders"
ON public.invoice_reminders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_reminders.invoice_id AND i.user_id = auth.uid()
));

CREATE POLICY "Owners can delete reminders"
ON public.invoice_reminders FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.invoices i
  WHERE i.id = invoice_reminders.invoice_id AND i.user_id = auth.uid()
));

-- payment_logs: lock down writes (service_role bypasses RLS)
CREATE POLICY "Deny user inserts on payment_logs"
ON public.payment_logs AS RESTRICTIVE FOR INSERT
TO authenticated WITH CHECK (false);

CREATE POLICY "Deny user updates on payment_logs"
ON public.payment_logs AS RESTRICTIVE FOR UPDATE
TO authenticated USING (false);

CREATE POLICY "Deny user deletes on payment_logs"
ON public.payment_logs AS RESTRICTIVE FOR DELETE
TO authenticated USING (false);

-- subscriptions: lock down user updates/deletes (managed by Stripe webhook via service_role)
CREATE POLICY "Deny user updates on subscriptions"
ON public.subscriptions AS RESTRICTIVE FOR UPDATE
TO authenticated USING (false);

CREATE POLICY "Deny user deletes on subscriptions"
ON public.subscriptions AS RESTRICTIVE FOR DELETE
TO authenticated USING (false);

-- user_roles: explicit deny for non-admin writes (defense-in-depth)
CREATE POLICY "Deny self role insert"
ON public.user_roles AS RESTRICTIVE FOR INSERT
TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny self role delete"
ON public.user_roles AS RESTRICTIVE FOR DELETE
TO authenticated USING (public.has_role(auth.uid(), 'admin'));
