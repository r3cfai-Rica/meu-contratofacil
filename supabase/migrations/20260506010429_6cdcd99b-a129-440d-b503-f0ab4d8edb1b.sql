
-- ============================================
-- AUDIT LOGS — administrative event tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_id UUID,
  target_user_id UUID,
  target_email TEXT,
  plan TEXT,
  amount_cents BIGINT,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON public.audit_logs(target_user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- AUDIT TRIGGERS
-- ============================================

-- New signup
CREATE OR REPLACE FUNCTION public.audit_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(event_type, target_user_id, target_email, metadata)
  VALUES ('user.signup', NEW.id, NEW.email, jsonb_build_object('provider', NEW.raw_app_meta_data->>'provider'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_audit ON auth.users;
CREATE TRIGGER on_auth_user_created_audit
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_new_user();

-- Subscription change
CREATE OR REPLACE FUNCTION public.audit_subscription_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(event_type, target_user_id, target_email, plan, metadata)
    VALUES ('subscription.created', NEW.user_id, _email, NEW.plan::TEXT,
      jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.plan IS DISTINCT FROM NEW.plan THEN
      INSERT INTO public.audit_logs(event_type, target_user_id, target_email, plan, metadata)
      VALUES ('subscription.plan_changed', NEW.user_id, _email, NEW.plan::TEXT,
        jsonb_build_object('from', OLD.plan, 'to', NEW.plan, 'status', NEW.status));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs(event_type, target_user_id, target_email, plan, metadata)
      VALUES ('subscription.status_changed', NEW.user_id, _email, NEW.plan::TEXT,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    IF OLD.cancel_at_period_end = false AND NEW.cancel_at_period_end = true THEN
      INSERT INTO public.audit_logs(event_type, target_user_id, target_email, plan, metadata)
      VALUES ('subscription.cancel_scheduled', NEW.user_id, _email, NEW.plan::TEXT, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_change_audit ON public.subscriptions;
CREATE TRIGGER on_subscription_change_audit
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_change();

-- Invoice paid
CREATE OR REPLACE FUNCTION public.audit_invoice_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid') THEN
    SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
    INSERT INTO public.audit_logs(event_type, target_user_id, target_email, amount_cents, reference_id, metadata)
    VALUES ('invoice.paid', NEW.user_id, _email,
      (NEW.amount * 100)::BIGINT, NEW.id::TEXT,
      jsonb_build_object('description', NEW.description, 'client_id', NEW.client_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_paid_audit ON public.invoices;
CREATE TRIGGER on_invoice_paid_audit
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_invoice_paid();

-- Team invite events
CREATE OR REPLACE FUNCTION public.audit_team_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.owner_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(event_type, actor_id, target_user_id, target_email, metadata)
    VALUES ('team.invited', NEW.owner_id, NEW.member_user_id, NEW.email,
      jsonb_build_object('owner_email', _email));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs(event_type, actor_id, target_user_id, target_email, metadata)
    VALUES ('team.' || NEW.status::TEXT, NEW.owner_id, NEW.member_user_id, NEW.email,
      jsonb_build_object('owner_email', _email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_change_audit ON public.team_members;
CREATE TRIGGER on_team_change_audit
  AFTER INSERT OR UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_team_change();

-- ============================================
-- ADMIN OVERVIEW (extended metrics)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'free_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan='free' AND status IN ('active','trialing')),
    'pro_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan='pro' AND status IN ('active','trialing')),
    'business_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan='business' AND status IN ('active','trialing')),
    'paying_users', (SELECT COUNT(*) FROM public.subscriptions WHERE plan IN ('pro','business') AND status IN ('active','trialing')),
    'canceled_users', (SELECT COUNT(*) FROM public.subscriptions WHERE status='canceled'),
    'past_due_users', (SELECT COUNT(*) FROM public.subscriptions WHERE status='past_due'),
    'cancel_scheduled', (SELECT COUNT(*) FROM public.subscriptions WHERE cancel_at_period_end=true),
    'mrr_cents', (SELECT COALESCE(SUM(CASE WHEN plan='pro' THEN 4900 WHEN plan='business' THEN 9900 ELSE 0 END),0)
                  FROM public.subscriptions WHERE plan IN ('pro','business') AND status IN ('active','trialing')),
    'total_contracts', (SELECT COUNT(*) FROM public.contracts),
    'total_clients', (SELECT COUNT(*) FROM public.clients),
    'total_invoices', (SELECT COUNT(*) FROM public.invoices),
    'paid_invoices', (SELECT COUNT(*) FROM public.invoices WHERE status='paid'),
    'overdue_invoices', (SELECT COUNT(*) FROM public.invoices WHERE status='pending' AND due_date < CURRENT_DATE),
    'total_revenue_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE status='paid'),
    'revenue_30d_cents', (SELECT COALESCE(SUM(amount*100),0)::BIGINT FROM public.invoices WHERE status='paid' AND paid_at >= now() - INTERVAL '30 days'),
    'signups_last_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - INTERVAL '7 days'),
    'signups_last_30d', (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - INTERVAL '30 days'),
    'team_invites_pending', (SELECT COUNT(*) FROM public.team_members WHERE status='pending'),
    'team_invites_accepted', (SELECT COUNT(*) FROM public.team_members WHERE status='accepted')
  ) INTO result;
  RETURN result;
END;
$$;

-- Recent paid invoices for admin
CREATE OR REPLACE FUNCTION public.list_admin_recent_payments(_limit INT DEFAULT 20)
RETURNS TABLE (
  invoice_id UUID,
  paid_at TIMESTAMPTZ,
  amount_cents BIGINT,
  description TEXT,
  user_email TEXT,
  client_name TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT i.id, i.paid_at, (i.amount*100)::BIGINT, i.description,
         u.email::TEXT, COALESCE(c.full_name, '')
  FROM public.invoices i
  LEFT JOIN auth.users u ON u.id = i.user_id
  LEFT JOIN public.clients c ON c.id = i.client_id
  WHERE i.status = 'paid'
  ORDER BY i.paid_at DESC NULLS LAST
  LIMIT _limit;
END;
$$;

-- Recent audit logs for admin
CREATE OR REPLACE FUNCTION public.list_admin_audit_logs(_limit INT DEFAULT 50)
RETURNS SETOF public.audit_logs
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT * FROM public.audit_logs
  ORDER BY created_at DESC
  LIMIT _limit;
END;
$$;

-- Backfill: log existing users as signups so the audit trail isn't empty
INSERT INTO public.audit_logs(event_type, target_user_id, target_email, created_at, metadata)
SELECT 'user.signup', u.id, u.email, u.created_at, '{"backfill": true}'::jsonb
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_logs a WHERE a.target_user_id = u.id AND a.event_type = 'user.signup'
);
