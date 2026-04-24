import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, CheckCircle2, Copy, FileText, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildPixPayload } from "@/lib/pix";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";
import {
  InvoiceStatusBadge,
  getEffectiveStatus,
  type InvoiceStatus,
} from "@/components/invoices/InvoiceStatusBadge";

export const Route = createFileRoute("/pagar/$token")({
  head: () => ({
    meta: [
      { title: "Pagar cobrança — ContratoFácil" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicInvoicePage,
});

interface PublicInvoice {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  paid_at: string | null;
  user_id: string;
  clients: { full_name: string } | null;
}

interface PixSettings {
  pix_key: string;
  beneficiary_name: string;
  city: string;
}

function PublicInvoicePage() {
  const { token } = Route.useParams();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [pix, setPix] = useState<PixSettings | null>(null);
  const [providerName, setProviderName] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState<"key" | "code" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: inv } = await supabase
        .from("invoices")
        .select(
          "id, description, amount, due_date, status, paid_at, user_id, clients(full_name)",
        )
        .eq("public_token", token)
        .maybeSingle();

      const invoice = inv as unknown as PublicInvoice | null;
      setInvoice(invoice);

      if (invoice) {
        const [pixRes, profRes] = await Promise.all([
          supabase
            .from("pix_settings")
            .select("pix_key, beneficiary_name, city")
            .eq("user_id", invoice.user_id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", invoice.user_id)
            .maybeSingle(),
        ]);

        const pixData = pixRes.data as PixSettings | null;
        setPix(pixData);
        if (profRes.data?.full_name) setProviderName(profRes.data.full_name);

        if (pixData) {
          const payload = buildPixPayload({
            pixKey: pixData.pix_key,
            beneficiaryName: pixData.beneficiary_name,
            city: pixData.city,
            amount: Number(invoice.amount),
            txid: invoice.id.replace(/-/g, "").slice(0, 25),
            description: invoice.description,
          });
          const url = await QRCode.toDataURL(payload, {
            width: 320,
            margin: 1,
            color: { dark: "#0F172A", light: "#FFFFFF" },
          });
          setQrUrl(url);
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const copy = async (text: string, type: "key" | "code") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === "key" ? "Chave PIX copiada" : "Código PIX copiado");
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando cobrança...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Cobrança não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique o link com quem te enviou.
          </p>
        </div>
      </div>
    );
  }

  const effective = getEffectiveStatus(invoice.status, invoice.due_date);
  const isPaid = effective === "paid";
  const isCancelled = effective === "cancelled";
  const pixPayload =
    pix &&
    buildPixPayload({
      pixKey: pix.pix_key,
      beneficiaryName: pix.beneficiary_name,
      city: pix.city,
      amount: Number(invoice.amount),
      txid: invoice.id.replace(/-/g, "").slice(0, 25),
      description: invoice.description,
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <span>
              Contrato<span className="text-primary">Fácil</span>
            </span>
          </div>
          {providerName && (
            <span className="text-xs text-muted-foreground">
              Cobrança de <strong className="text-foreground">{providerName}</strong>
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-2xl border border-border/70 bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Cobrança PIX
              </p>
              <h1 className="mt-1 text-lg font-semibold">{invoice.description}</h1>
              {invoice.clients?.full_name && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Para: {invoice.clients.full_name}
                </p>
              )}
            </div>
            <InvoiceStatusBadge status={effective} />
          </div>

          <div className="mt-5 grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Valor a pagar</p>
              <p className="mt-1 text-3xl font-semibold text-primary">
                {formatCurrencyBRL(Number(invoice.amount))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="mt-1 text-base font-medium">
                {formatDateBR(invoice.due_date)}
              </p>
            </div>
          </div>
        </div>

        {isPaid ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-3 text-lg font-semibold text-emerald-200">
              Pagamento confirmado ✅
            </h2>
            {invoice.paid_at && (
              <p className="mt-1 text-sm text-emerald-200/80">
                Recebido em {formatDateBR(invoice.paid_at)}
              </p>
            )}
          </div>
        ) : isCancelled ? (
          <div className="rounded-2xl border border-border/70 bg-card p-6 text-center">
            <h2 className="text-base font-semibold">Cobrança cancelada</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre em contato com {providerName || "o prestador"} para mais
              informações.
            </p>
          </div>
        ) : !pix || !pixPayload ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-center text-sm text-yellow-200">
            O prestador ainda não configurou a chave PIX. Entre em contato para
            obter os dados de pagamento.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <QrCode className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Pague com PIX</h2>
                <span className="ml-auto text-xs text-yellow-300">
                  Aguardando pagamento
                </span>
              </div>

              <div className="mt-5 grid gap-6 sm:grid-cols-[auto,1fr] sm:items-center">
                {qrUrl && (
                  <div className="mx-auto rounded-xl bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="QR Code PIX"
                      className="h-48 w-48"
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Chave PIX ({pix.beneficiary_name})
                    </p>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                      <span className="flex-1 truncate font-mono text-sm">
                        {pix.pix_key}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(pix.pix_key, "key")}
                        className="gap-1"
                      >
                        {copied === "key" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      PIX Copia e Cola
                    </p>
                    <div className="mt-1 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                      <span className="flex-1 break-all font-mono text-[11px] leading-relaxed">
                        {pixPayload}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(pixPayload, "code")}
                        className="shrink-0 gap-1"
                      >
                        {copied === "code" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <h2 className="text-sm font-semibold">Como pagar</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "Abra o app do seu banco e selecione a opção PIX.",
                  "Escaneie o QR Code acima ou cole o código PIX (Copia e Cola).",
                  "Confira o valor, o beneficiário, e confirme o pagamento.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                A confirmação é feita manualmente pelo prestador. Você verá o
                status atualizado nesta página assim que o pagamento for
                identificado.
              </p>
            </div>
          </>
        )}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Pagamento processado com segurança via{" "}
          <span className="font-semibold text-foreground">
            Contrato<span className="text-primary">Fácil</span>
          </span>
        </p>
      </main>
    </div>
  );
}
