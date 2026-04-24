
-- ============================================
-- TEAM MEMBERS (Business plan: up to 3 members)
-- ============================================

CREATE TYPE public.team_invite_status AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,           -- the Business account owner
  member_user_id UUID,              -- filled when invited user accepts (= auth.users.id)
  email TEXT NOT NULL,              -- invited email
  status public.team_invite_status NOT NULL DEFAULT 'pending',
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email)
);

CREATE INDEX idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX idx_team_members_member_user ON public.team_members(member_user_id);
CREATE INDEX idx_team_members_token ON public.team_members(invite_token);
CREATE INDEX idx_team_members_email ON public.team_members(lower(email));

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own team
CREATE POLICY "Owners can view own team"
  ON public.team_members FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own team"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own team"
  ON public.team_members FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own team"
  ON public.team_members FOR DELETE
  USING (auth.uid() = owner_id);

-- Public lookup by invite token (so invited user can accept)
CREATE POLICY "Public can view invite by token"
  ON public.team_members FOR SELECT
  USING (invite_token IS NOT NULL);

-- Member can update only to accept their own invite
CREATE POLICY "Member can accept own invite"
  ON public.team_members FOR UPDATE
  USING (
    invite_token IS NOT NULL
    AND status = 'pending'
    AND (member_user_id IS NULL OR member_user_id = auth.uid())
  );

CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- HELPER: list of owner_ids the current user has access to
-- (= self + owners that accepted them as a member)
-- ============================================

CREATE OR REPLACE FUNCTION public.user_workspace_owners(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id
  UNION
  SELECT owner_id FROM public.team_members
  WHERE member_user_id = _user_id AND status = 'accepted';
$$;

CREATE OR REPLACE FUNCTION public.count_team_members(_owner_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.team_members
  WHERE owner_id = _owner_id AND status IN ('pending', 'accepted');
$$;

-- ============================================
-- EXPAND RLS so accepted team members can read owner's data
-- ============================================

-- CLIENTS
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Users and team can view clients"
  ON public.clients FOR SELECT
  USING (user_id IN (SELECT public.user_workspace_owners(auth.uid())));

-- CONTRACTS (read)
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
CREATE POLICY "Users and team can view contracts"
  ON public.contracts FOR SELECT
  USING (user_id IN (SELECT public.user_workspace_owners(auth.uid())));

-- INVOICES (read)
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Users and team can view invoices"
  ON public.invoices FOR SELECT
  USING (user_id IN (SELECT public.user_workspace_owners(auth.uid())));

-- ============================================
-- REMINDERS: track which invoices we've already nudged
-- ============================================

CREATE TABLE public.invoice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,  -- 'pre_due_3d'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_email TEXT,
  UNIQUE (invoice_id, reminder_type)
);

CREATE INDEX idx_invoice_reminders_invoice ON public.invoice_reminders(invoice_id);

ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and team can view reminders"
  ON public.invoice_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_reminders.invoice_id
        AND i.user_id IN (SELECT public.user_workspace_owners(auth.uid()))
    )
  );
