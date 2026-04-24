import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  ContractStatusBadge,
  type ContractStatus,
} from "@/components/contracts/ContractStatusBadge";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";

export const Route = createFileRoute("/c/$token")({
  head: () => ({
    meta: [
      { title: "Assinar contrato — ContratoFácil" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicContractPage,
});

interface PublicContract {
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
  clients: { full_name: string; document: string | null; email: string | null } | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  one_time: "À vista",
  installments: "Parcelado",
  recurring: "Recorrente",
};

function PublicContractPage() {
  const { token } = Route.useParams();
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    supabase
      .from("contracts")
      .select(
        "id, contract_number, title, service_type, service_description, total_value, payment_method, start_date, end_date, clauses, status, clients(full_name, document, email)",
      )
      .eq("public_token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        setContract(data as unknown as PublicContract);
      });
  }, [token]);

  const handleSign = async () => {
    if (!contract) return;
    if (!signerName.trim()) {
      toast.error("Digite seu nome completo para assinar");
      return;
    }
    setSigning(true);
    const { error } = await supabase
      .from("contracts")
      .update({ status: "signed" })
      .eq("public_token", token);
    setSigning(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contrato assinado com sucesso!");
    setContract({ ...contract, status: "signed" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center">
          <h1 className="text-lg font-semibold">Contrato não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O link pode ter expirado ou ser inválido.
          </p>
        </div>
      </div>
    );
  }

  const isSigned = contract.status === "signed";

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FileSignature className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              ContratoFácil
            </div>
            <div className="text-sm font-medium">{contract.contract_number}</div>
          </div>
          <div className="ml-auto">
            <ContractStatusBadge status={contract.status} />
          </div>
        </header>

        <article className="rounded-2xl border border-border/70 bg-card p-6 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight">{contract.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contract.service_type}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Cliente" value={contract.clients?.full_name ?? "—"} />
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
          </dl>

          {contract.service_description && (
            <section className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Descrição do serviço
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {contract.service_description}
              </p>
            </section>
          )}

          {contract.clauses && (
            <section className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Cláusulas
              </h2>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                {contract.clauses}
              </pre>
            </section>
          )}

          <div className="mt-10 border-t border-border/70 pt-6">
            {isSigned ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                Este contrato foi assinado.
              </div>
            ) : contract.status === "cancelled" ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                Este contrato foi cancelado.
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Assinatura digital</h3>
                <div className="space-y-2">
                  <Label htmlFor="signer">Seu nome completo</Label>
                  <Input
                    id="signer"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Como aparece no documento"
                  />
                </div>
                <Button onClick={handleSign} disabled={signing} className="gap-2">
                  {signing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Assinar contrato
                </Button>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
