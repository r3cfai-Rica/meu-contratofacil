import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";

type ClientStatus = "active" | "inactive" | "canceled";

interface ClientDetails {
  client: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    document: string | null;
    address: string | null;
    notes: string | null;
    status: ClientStatus;
    created_at: string;
    updated_at: string;
  };
  owner: {
    user_id: string;
    email: string;
    full_name: string;
    plan: string;
    subscription_status: string;
  };
  contracts_count: number;
  invoices_count: number;
  total_paid_cents: number;
  pending_invoices_cents: number;
  recent_invoices: Array<{
    id: string;
    description: string;
    amount: number;
    status: string;
    due_date: string;
    paid_at: string | null;
  }>;
  recent_contracts: Array<{
    id: string;
    contract_number: string;
    title: string;
    status: string;
    total_value: number;
    start_date: string;
  }>;
}

interface Props {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (clientId: string, status: ClientStatus) => void;
}

export function AdminClientDetailDialog({
  clientId,
  open,
  onOpenChange,
  onStatusChanged,
}: Props) {
  const [data, setData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<ClientStatus | null>(null);

  useEffect(() => {
    if (!open || !clientId) return;
    setLoading(true);
    setData(null);
    void (async () => {
      const { data: res, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>)(
        "admin_get_client_details",
        { _client_id: clientId },
      );
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setData(res as ClientDetails);
    })();
  }, [open, clientId]);

  const updateStatus = async (status: ClientStatus) => {
    if (!clientId) return;
    setUpdating(status);
    const { error } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>)("admin_update_client_status", {
      _client_id: clientId,
      _status: status,
    });
    setUpdating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "active"
        ? "Cliente reativado"
        : status === "inactive"
          ? "Cliente desativado"
          : "Cliente cancelado",
    );
    setData((d) => (d ? { ...d, client: { ...d.client, status } } : d));
    onStatusChanged(clientId, status);
  };

  const c = data?.client;
  const status = c?.status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do cliente</DialogTitle>
          <DialogDescription>
            Dados cadastrais, histórico e ações administrativas.
          </DialogDescription>
        </DialogHeader>

        {loading || !data || !c ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{c.full_name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      status === "active"
                        ? "default"
                        : status === "canceled"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {status === "active"
                      ? "Ativo"
                      : status === "canceled"
                        ? "Cancelado"
                        : "Inativo"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Desde {formatDateBR(c.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={status === "active" || updating !== null}
                  onClick={() => void updateStatus("active")}
                  className="gap-2"
                >
                  {updating === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  Reativar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={status === "inactive" || updating !== null}
                  onClick={() => void updateStatus("inactive")}
                  className="gap-2"
                >
                  {updating === "inactive" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PauseCircle className="h-4 w-4" />
                  )}
                  Desativar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={status === "canceled" || updating !== null}
                  onClick={() => void updateStatus("canceled")}
                  className="gap-2"
                >
                  {updating === "canceled" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Cancelar
                </Button>
              </div>
            </div>

            <Separator />

            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail" value={c.email ?? "—"} />
              <Field label="Telefone" value={c.phone ?? "—"} />
              <Field label="Documento" value={c.document ?? "—"} />
              <Field label="Endereço" value={c.address ?? "—"} />
              <Field
                label="Observações"
                value={c.notes ?? "—"}
                full
              />
            </section>

            <Separator />

            <section>
              <h4 className="mb-2 text-sm font-semibold">Dono da conta</h4>
              <div className="grid gap-2 rounded-md border border-border/70 bg-muted/30 p-3 sm:grid-cols-2">
                <Field label="Nome" value={data.owner.full_name || "(sem nome)"} />
                <Field label="E-mail" value={data.owner.email} />
                <Field label="Plano" value={data.owner.plan.toUpperCase()} />
                <Field label="Assinatura" value={data.owner.subscription_status} />
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-4">
              <Metric label="Contratos" value={data.contracts_count.toString()} />
              <Metric label="Cobranças" value={data.invoices_count.toString()} />
              <Metric
                label="Total pago"
                value={formatCurrencyBRL(data.total_paid_cents / 100)}
              />
              <Metric
                label="Pendente"
                value={formatCurrencyBRL(data.pending_invoices_cents / 100)}
              />
            </section>

            {data.recent_contracts.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Contratos recentes</h4>
                <ul className="space-y-2">
                  {data.recent_contracts.map((ct) => (
                    <li
                      key={ct.id}
                      className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{ct.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {ct.contract_number} · {formatDateBR(ct.start_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs capitalize text-muted-foreground">
                          {ct.status}
                        </span>
                        <span className="font-medium">
                          {formatCurrencyBRL(Number(ct.total_value))}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.recent_invoices.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-semibold">Cobranças recentes</h4>
                <ul className="space-y-2">
                  {data.recent_invoices.map((iv) => (
                    <li
                      key={iv.id}
                      className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{iv.description}</span>
                        <span className="text-xs text-muted-foreground">
                          Venc. {formatDateBR(iv.due_date)}
                          {iv.paid_at && ` · Pago em ${formatDateBR(iv.paid_at)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs capitalize text-muted-foreground">
                          {iv.status}
                        </span>
                        <span className="font-medium">
                          {formatCurrencyBRL(Number(iv.amount))}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-card px-3 py-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
