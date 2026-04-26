import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  TrendingUp,
  FileSignature,
  ShieldCheck,
  Loader2,
  DollarSign,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface AdminStats {
  total_users: number;
  free_users: number;
  pro_users: number;
  business_users: number;
  paying_users: number;
  mrr_cents: number;
  total_contracts: number;
  total_clients: number;
  total_invoices: number;
  total_revenue_cents: number;
  signups_last_30d: number;
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

function AdminPage() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    const [statsRes, usersRes] = await Promise.all([
      supabase.rpc("get_admin_stats"),
      supabase.rpc("list_admin_users"),
    ]);
    if (statsRes.error) toast.error(statsRes.error.message);
    else setStats(statsRes.data as unknown as AdminStats);
    if (usersRes.error) toast.error(usersRes.error.message);
    else setUsers((usersRes.data as unknown as AdminUserRow[]) ?? []);
    setLoading(false);
  };

  if (roleLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.plan.toLowerCase().includes(q)
    );
  });

  const planColor = (plan: string) => {
    if (plan === "business") return "bg-primary text-primary-foreground";
    if (plan === "pro") return "bg-secondary text-secondary-foreground";
    return "bg-muted text-muted-foreground";
  };

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
              Vendas, assinantes e visão geral da plataforma
            </p>
          </div>
        </div>

        {loading || !stats ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<DollarSign className="h-4 w-4" />}
                label="MRR (Receita Mensal)"
                value={formatCurrencyBRL(stats.mrr_cents / 100)}
                hint={`${stats.paying_users} assinantes pagantes`}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Receita Total (cobranças pagas)"
                value={formatCurrencyBRL(stats.total_revenue_cents / 100)}
                hint={`${stats.total_invoices} cobranças no total`}
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Usuários"
                value={stats.total_users.toLocaleString("pt-BR")}
                hint={`+${stats.signups_last_30d} nos últimos 30 dias`}
              />
              <StatCard
                icon={<FileSignature className="h-4 w-4" />}
                label="Contratos Criados"
                value={stats.total_contracts.toLocaleString("pt-BR")}
                hint={`${stats.total_clients} clientes cadastrados`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <PlanCard label="Grátis" count={stats.free_users} variant="muted" />
              <PlanCard label="Pro" count={stats.pro_users} variant="secondary" />
              <PlanCard label="Business" count={stats.business_users} variant="primary" />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Usuários e assinantes
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filtered.length} de {users.length} usuários
                  </p>
                </div>
                <Input
                  placeholder="Buscar por e-mail, nome ou plano..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
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
                                <span className="text-xs text-muted-foreground">
                                  {u.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={planColor(u.plan)}>
                                {u.plan.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm capitalize">
                                {u.subscription_status}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDateBR(u.signed_up_at)}
                            </TableCell>
                            <TableCell className="text-right">{u.contracts_count}</TableCell>
                            <TableCell className="text-right">{u.clients_count}</TableCell>
                            <TableCell className="text-right">{u.invoices_count}</TableCell>
                            <TableCell className="text-sm">
                              {u.current_period_end
                                ? formatDateBR(u.current_period_end)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
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
