import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, QrCode, CheckCircle2, XCircle, Trash2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import {
  InvoiceStatusBadge,
  getEffectiveStatus,
  type InvoiceStatus,
} from "@/components/invoices/InvoiceStatusBadge";
import { UpgradeDialog } from "@/components/billing/UpgradeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/use-plan";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/cobrancas")({
  head: () => ({ meta: [{ title: "Cobranças — ContratoFácil" }] }),
  component: InvoicesRoute,
});

function InvoicesRoute() {
  return (
    <AppLayout>
      <InvoicesPage />
    </AppLayout>
  );
}

interface Invoice {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  public_token: string | null;
  paid_at: string | null;
  client_id: string;
  clients: { full_name: string } | null;
}

type Period = "all" | "30" | "60" | "overdue" | "month";

function InvoicesPage() {
  const { user } = useAuth();
  const { planInfo } = usePlan();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [period, setPeriod] = useState<Period>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Invoice | null>(null);

  const limit = planInfo.limits.maxInvoicesPerMonth;
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return invoices.filter((i) => {
      // we don't have created_at in this select; approximate by due_date month
      const d = new Date(i.due_date + "T00:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [invoices]);
  const handleNewInvoice = () => {
    if (limit !== null && thisMonthCount >= limit) {
      setUpgradeOpen(true);
      return;
    }
    setDialogOpen(true);
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, description, amount, due_date, status, public_token, paid_at, client_id, clients(full_name)",
      )
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInvoices((data ?? []) as unknown as Invoice[]);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const enriched = useMemo(
    () =>
      invoices.map((i) => ({
        ...i,
        effective: getEffectiveStatus(i.status, i.due_date),
      })),
    [invoices],
  );

  const summary = useMemo(() => {
    const acc = { pending: 0, paid: 0, overdue: 0, cancelled: 0 };
    for (const i of enriched) acc[i.effective] += Number(i.amount);
    return acc;
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return enriched.filter((i) => {
      if (statusFilter !== "all" && i.effective !== statusFilter) return false;
      if (period !== "all") {
        const due = new Date(i.due_date + "T00:00:00");
        if (period === "overdue" && i.effective !== "overdue") return false;
        if (period === "30" || period === "60") {
          const days = period === "30" ? 30 : 60;
          const horizon = new Date();
          horizon.setDate(horizon.getDate() + days);
          if (due < now || due > horizon) return false;
        }
        if (period === "month") {
          if (
            due.getMonth() !== now.getMonth() ||
            due.getFullYear() !== now.getFullYear()
          )
            return false;
        }
      }
      if (!q) return true;
      return (
        i.clients?.full_name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      );
    });
  }, [enriched, search, statusFilter, period]);

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cobrança marcada como paga");
    void load();
  };

  const cancelInvoice = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cobrança cancelada");
    void load();
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cobrança excluída");
    setToDelete(null);
    void load();
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/pagar/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link de pagamento copiado");
  };

  const cards: Array<{ key: InvoiceStatus; label: string; value: number; tone: string }> = [
    { key: "pending", label: "Pendente", value: summary.pending, tone: "text-yellow-300" },
    { key: "paid", label: "Recebido", value: summary.paid, tone: "text-emerald-300" },
    { key: "overdue", label: "Vencido", value: summary.overdue, tone: "text-red-300" },
    { key: "cancelled", label: "Cancelado", value: summary.cancelled, tone: "text-slate-300" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cobranças</h1>
          <p className="text-sm text-muted-foreground">
            Gere cobranças PIX e acompanhe os pagamentos.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nova cobrança
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.key}
            className="rounded-2xl border border-border/70 bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <InvoiceStatusBadge status={c.key} />
            </div>
            <p className={`mt-2 text-2xl font-semibold ${c.tone}`}>
              {formatCurrencyBRL(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou descrição"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="30">Próximos 30 dias</SelectItem>
            <SelectItem value="60">Próximos 60 dias</SelectItem>
            <SelectItem value="overdue">Apenas vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <QrCode className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold">
              {invoices.length === 0
                ? "Nenhuma cobrança ainda"
                : "Nada encontrado"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {invoices.length === 0
                ? "Gere sua primeira cobrança PIX para começar."
                : "Tente ajustar os filtros ou a busca."}
            </p>
            {invoices.length === 0 && (
              <Button
                className="mt-5 gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" /> Nova cobrança
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    {i.clients?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {i.description}
                  </TableCell>
                  <TableCell>{formatCurrencyBRL(Number(i.amount))}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateBR(i.due_date)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={i.effective} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {i.public_token && i.effective !== "cancelled" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Copiar link"
                            onClick={() => copyLink(i.public_token!)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Abrir página de pagamento"
                            asChild
                          >
                            <Link
                              to="/pagar/$token"
                              params={{ token: i.public_token }}
                              target="_blank"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </>
                      )}
                      {i.effective !== "paid" && i.effective !== "cancelled" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Marcar como pago"
                          onClick={() => markAsPaid(i.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </Button>
                      )}
                      {i.effective !== "cancelled" && i.effective !== "paid" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Cancelar"
                          onClick={() => cancelInvoice(i.id)}
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Excluir"
                        onClick={() => setToDelete(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteInvoice(toDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
