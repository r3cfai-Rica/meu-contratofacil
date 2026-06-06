DROP POLICY IF EXISTS "Users can view history of own contracts" ON public.contract_history;
CREATE POLICY "Users can view history of own contracts"
ON public.contract_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_history.contract_id
      AND c.user_id IN (SELECT public.user_workspace_owners(auth.uid()))
  )
);