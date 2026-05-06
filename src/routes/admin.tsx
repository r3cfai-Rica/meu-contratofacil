import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  CreditCard,
  TrendingUp,
  FileSignature,
  ShieldCheck,
  Loader2,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Activity,
  Receipt,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ContratoFácil" },
      { name: "description", content: "Painel administrativo." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

interface AdminOverview {
  total_users: number;
  free_users: number;
  pro_users: number;
  business_users: number;
  paying_users: number;
  canceled_users: number;
  past_due_users: number;
  cancel_scheduled: number;
  mrr_cents: number;
  total_contracts: number;
  total_clients: number;
  total_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_revenue_cents: number;
  revenue_30d_cents: number;
  signups_last_7d: number;
  signups_last_30d: number;
  team_invites_pending: number;
  team_invites_accepted: number;
}

interface AdminUserRow {
  user_id: string;
  email: string;
  full_name: string;
  account_type: string;
  plan: "free" | "pro" | "business";
  subscription_status: string;
  current_period_end: string | null;
  signed_up_at: string;
  contracts_count: number;
  clients_count: number;
  invoices_count: number;
  is_admin: boolean;
}

interface PaymentRow {
  invoice_id: string;
  paid_at: string | null;
  amount_cents: number;
  description: string;
  user_email: string;
  client_name: string;
}

interface AuditRow {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  plan: string | null;
  amount_cents: number | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function AdminPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      toast.error("Acesso restrito");
      navigate({ to: "/dashboard" });
      return;
    }
    void loadData();
  }, [isAdmin, roleLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    const [ovRes, usersRes, payRes, audRes] = await Promise.all([
      supabase.rpc("get_admin_overview"),
      supabase.rpc("list_admin_users"),
      supabase.rpc("list_admin_recent_payments", { _limit: 25 }),
      supabase.rpc("list_admin_audit_logs", { _limit: 80 }),
    ]);
    if (ovRes.error) toast.error(ovRes.error.message);
    else setOverview(ovRes.data as unknown as AdminOverview);
    if (usersRes.error) toast.error(usersRes.error.message);
    else setUsers((usersRes.data as unknown as AdminUserRow[]) ?? []);
    if (payRes.error) toast.error(payRes.error.message);
    else setPayments((payRes.data as unknown as PaymentRow[]) ?? []);
    if (audRes.error) toast.error(audRes.error.message);
    else setAudit((audRes.data as unknown as AuditRow[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (planFilter !== "all" && u.plan !== planFilter) return false;
      if (statusFilter !== "all" && u.subscription_status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q)
      );
    });
  }, [users, search, planFilter, statusFilter]);

  if (roleLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Vendas, assinantes, pagamentos e auditoria da plataforma
            </p>
          </div>
        </div>

        {loading || !overview ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<DollarSign className="h-4 w-4" />}
                label="MRR"
                value={formatCurrencyBRL(overview.mrr_cents / 100)}
                hint={`${overview.paying_users} assinantes pagantes`}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Receita 30d"
                value={formatCurrencyBRL(overview.revenue_30d_cents / 100)}
                hint={`Total: ${formatCurrencyBRL(overview.total_revenue_cents / 100)}`}
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Usuários"
                value={overview.total_users.toLocaleString("pt-BR")}
                hint={`+${overview.signups_last_7d} (7d) · +${overview.signups_last_30d} (30d)`}
              />
              <StatCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Em risco"
                value={(overview.past_due_users + overview.cancel_scheduled + overview.overdue_invoices).toString()}
                hint={`${overview.past_due_users} atraso · ${overview.cancel_scheduled} cancelando · ${overview.overdue_invoices} vencidas`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <PlanCard label="Grátis" count={overview.free_users} variant="muted" />
              <PlanCard label="Pro" count={overview.pro_users} variant="secondary" />
              <PlanCard label="Business" count={overview.business_users} variant="primary" />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <MiniStat icon={<FileSignature className="h-4 w-4" />} label="Contratos" value={overview.total_contracts} />
              <MiniStat icon={<Users className="h-4 w-4" />} label="Clientes" value={overview.total_clients} />
              <MiniStat icon={<Receipt className="h-4 w-4" />} label="Cobranças pagas" value={overview.paid_invoices} />
              <MiniStat icon={<Mail className="h-4 w-4" />} label="Convites" value={overview.team_invites_accepted} hint={`${overview.team_invites_pending} pendentes`} />
            </div>

            <Tabs defaultValue="users">
              <TabsList>
                <TabsTrigger value="users">Usuários ({users.length})</TabsTrigger>
                <TabsTrigger value="payments">Pagamentos ({payments.length})</TabsTrigger>
                <TabsTrigger value="audit">Auditoria ({audit.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <Card>
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Usuários e assinantes
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {filtered.length} de {users.length}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="Buscar por e-mail ou nome..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-64"
                      />
                      <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos planos</SelectItem>
                          <SelectItem value="free">Grátis</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos status</SelectItem>
                          <SelectItem value="active">Ativos</SelectItem>
                          <SelectItem value="trialing">Em trial</SelectItem>
                          <SelectItem value="past_due">Em atraso</SelectItem>
                          <SelectItem value="canceled">Cancelados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Contratos</TableHead>
                            <TableHead className="text-right">Clientes</TableHead>
                            <TableHead className="text-right">Cobranças</TableHead>
                            <TableHead>Próx. cobrança</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground">
                                Nenhum usuário encontrado.
                              </TableCell>
                            </TableRow>
                          ) : (
                            filtered.map((u) => (
                              <TableRow key={u.user_id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="flex items-center gap-2 font-medium">
                                      {u.full_name || "(sem nome)"}
                                      {u.is_admin && (
                                        <Badge variant="outline" className="gap-1">
                                          <ShieldCheck className="h-3 w-3" />
                                          Admin
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={planColor(u.plan)}>{u.plan.toUpperCase()}</Badge>
                                </TableCell>
                                <TableCell className="text-sm capitalize">{u.subscription_status}</TableCell>
                                <TableCell className="text-sm">{formatDateBR(u.signed_up_at)}</TableCell>
                                <TableCell className="text-right">{u.contracts_count}</TableCell>
                                <TableCell className="text-right">{u.clients_count}</TableCell>
                                <TableCell className="text-right">{u.invoices_count}</TableCell>
                                <TableCell className="text-sm">
                                  {u.current_period_end ? formatDateBR(u.current_period_end) : "—"}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Pagamentos recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Nenhum pagamento ainda.
                              </TableCell>
                            </TableRow>
                          ) : (
                            payments.map((p) => (
                              <TableRow key={p.invoice_id}>
                                <TableCell className="text-sm">
                                  {p.paid_at ? formatDateBR(p.paid_at) : "—"}
                                </TableCell>
                                <TableCell className="text-sm">{p.user_email}</TableCell>
                                <TableCell className="text-sm">{p.client_name || "—"}</TableCell>
                                <TableCell className="text-sm">{p.description}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrencyBRL(p.amount_cents / 100)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audit">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Trilha de auditoria
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Eventos da plataforma: cadastros, mudanças de plano, pagamentos e equipe
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Quando</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {audit.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Nenhum evento ainda.
                              </TableCell>
                            </TableRow>
                          ) : (
                            audit.map((a) => (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(a.created_at).toLocaleString("pt-BR")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={eventVariant(a.event_type)}>{a.event_type}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{a.target_email ?? "—"}</TableCell>
                                <TableCell className="text-sm uppercase">{a.plan ?? "—"}</TableCell>
                                <TableCell className="text-right text-sm">
                                  {a.amount_cents ? formatCurrencyBRL(a.amount_cents / 100) : "—"}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function planColor(plan: string) {
  if (plan === "business") return "bg-primary text-primary-foreground";
  if (plan === "pro") return "bg-secondary text-secondary-foreground";
  return "bg-muted text-muted-foreground";
}

function eventVariant(t: string): "default" | "secondary" | "destructive" | "outline" {
  if (t.startsWith("invoice.paid")) return "default";
  if (t.startsWith("subscription.cancel") || t.includes("past_due")) return "destructive";
  if (t.startsWith("subscription.")) return "secondary";
  return "outline";
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value.toLocaleString("pt-BR")}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: "muted" | "secondary" | "primary";
}) {
  const styles =
    variant === "primary"
      ? "border-primary/30 bg-primary/5"
      : variant === "secondary"
        ? "border-secondary/40 bg-secondary/10"
        : "border-border bg-muted/30";
  return (
    <Card className={styles}>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">Plano {label}</p>
          <p className="mt-1 text-3xl font-semibold">{count}</p>
        </div>
        <CreditCard className="h-8 w-8 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
