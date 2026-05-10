import { useEffect, useState } from "react";
import { Copy, Download, History, Link as LinkIcon, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendContractEmail } from "@/lib/email.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";
import { generateContractPdf } from "@/lib/contractPdf";
import { useAuth } from "@/contexts/AuthContext";
import {
  ContractStatusBadge,
  type ContractStatus,
  CONTRACT_STATUS_LABELS,
} from "./ContractStatusBadge";

interface ContractRow {
  id: string;
  contract_number: string;
  title: string;
  service_type: string;
  service_description: string | null;
  total_value: number;
  payment_method: string;
  start_date: string;
  end_date: string | null;
  clauses: string | null;
  status: ContractStatus;
  public_token: string | null;
  client_id: string;
  clients?: { full_name: string } | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  contract: ContractRow | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  one_time: "À vista",
  installments: "Parcelado",
  recurring: "Recorrente",
};

export function ContractDetailDialog({ contract, onOpenChange, onChanged }: Props) {
  const { user } = useAuth();
  const sendEmail = useServerFn(sendContractEmail);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!contract) {
      setHistory([]);
      return;
    }
    supabase
      .from("contract_history")
      .select("id, action, details, created_at")
      .eq("contract_id", contract.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as HistoryEntry[]));
  }, [contract]);

  if (!contract) return null;

  const publicUrl = contract.public_token
    ? `${window.location.origin}/c/${contract.public_token}`
    : null;

  const generateLink = async () => {
    setLoadingAction(true);
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("contracts")
      .update({ public_token: token, status: "awaiting_signature" })
      .eq("id", contract.id);
    if (error) {
      setLoadingAction(false);
      toast.error(error.message);
      return;
    }
    toast.success("Link de assinatura gerado");
    // Envia email automaticamente
    try {
      const result = await sendEmail({
        data: { contractId: contract.id, appOrigin: window.location.origin },
      });
      toast.success(`Email enviado para ${result.recipient}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar email";
      toast.error(`Link gerado, mas o email falhou: ${msg}`);
    }
    setLoadingAction(false);
    onChanged();
  };

  const resendEmail = async () => {
    setSendingEmail(true);
    try {
      const result = await sendEmail({
        data: { contractId: contract.id, appOrigin: window.location.origin },
      });
      toast.success(`Email reenviado para ${result.recipient}`);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao reenviar email";
      toast.error(msg);
    } finally {
      setSendingEmail(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado");
  };

  const cancelContract = async () => {
    setLoadingAction(true);
    const { error } = await supabase
      .from("contracts")
      .update({ status: "cancelled" })
      .eq("id", contract.id);
    setLoadingAction(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contrato cancelado");
    onChanged();
  };

  const downloadPdf = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      // Fetch full contract + provider profile in parallel
      const [{ data: full }, { data: profile }] = await Promise.all([
        supabase
          .from("contracts")
          .select(
            "contract_number, title, service_type, service_description, total_value, payment_method, start_date, end_date, clauses, signer_name, signer_document, signer_display_name, signature_data, signature_type, signed_at, signer_ip",
          )
          .eq("id", contract.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, logo_url")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!full) {
        toast.error("Não foi possível carregar o contrato");
        return;
      }
      const pdf = await generateContractPdf({
        ...full,
        provider_name: profile?.full_name ?? null,
        provider_logo_url: profile?.logo_url ?? null,
        client_name: contract.clients?.full_name ?? null,
      });
      pdf.save(`${full.contract_number}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar PDF";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const describeAction = (h: HistoryEntry): string => {
    if (h.action === "created") return "Contrato criado";
    if (h.action === "status_changed") {
      const from = h.details?.from as ContractStatus | undefined;
      const to = h.details?.to as ContractStatus | undefined;
      return `Status alterado: ${from ? CONTRACT_STATUS_LABELS[from] : "?"} → ${to ? CONTRACT_STATUS_LABELS[to] : "?"}`;
    }
    if (h.action === "updated") return "Contrato atualizado";
    return h.action;
  };

  return (
    <Dialog open={!!contract} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{contract.title}</DialogTitle>
            <ContractStatusBadge status={contract.status} />
          </div>
          <DialogDescription>
            {contract.contract_number} · {contract.clients?.full_name ?? "Cliente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Serviço" value={contract.service_type} />
            <Field
              label="Valor"
              value={formatCurrencyBRL(Number(contract.total_value))}
            />
            <Field
              label="Pagamento"
              value={PAYMENT_LABELS[contract.payment_method] ?? contract.payment_method}
            />
            <Field label="Início" value={formatDateBR(contract.start_date)} />
            {contract.end_date && (
              <Field label="Término" value={formatDateBR(contract.end_date)} />
            )}
          </div>

          {contract.service_description && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Descrição
              </div>
              <p className="whitespace-pre-wrap text-sm">{contract.service_description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Baixar PDF
            </Button>
          </div>

          <Separator />

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="h-4 w-4 text-primary" /> Link público de assinatura
            </div>
            {publicUrl ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 truncate rounded-md bg-background/60 px-3 py-2 text-xs">
                  {publicUrl}
                </code>
                <Button size="sm" variant="secondary" onClick={copyLink} className="gap-2">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={generateLink}
                disabled={loadingAction}
                className="gap-2"
              >
                {loadingAction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gerar link e enviar para assinatura
              </Button>
            )}
          </div>

          {contract.clauses && (
            <details className="rounded-xl border border-border/70 bg-card/50 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Cláusulas do contrato
              </summary>
              <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                {contract.clauses}
              </pre>
            </details>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-primary" /> Histórico de alterações
            </div>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
                  >
                    <span>{describeAction(h)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {contract.status !== "cancelled" && contract.status !== "signed" && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelContract}
                disabled={loadingAction}
                className="text-destructive hover:text-destructive"
              >
                Cancelar contrato
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
