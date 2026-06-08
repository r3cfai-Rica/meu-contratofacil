
-- 1) Allow accepted members to view their own membership row
CREATE POLICY "Members can view own membership"
ON public.team_members
FOR SELECT
TO authenticated
USING (auth.uid() = member_user_id);

-- 2) Replace the restrictive role-insert policy so admins cannot self-grant admin
DROP POLICY IF EXISTS "Deny self role insert" ON public.user_roles;
DROP POLICY IF EXISTS "Deny self role delete" ON public.user_roles;

CREATE POLICY "Prevent self admin grant"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (NOT (role = 'admin'::app_role AND user_id = auth.uid()));

CREATE POLICY "Prevent self admin revoke"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (NOT (role = 'admin'::app_role AND user_id = auth.uid()));
