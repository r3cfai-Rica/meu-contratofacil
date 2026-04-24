import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSignature,
  Loader2,
  PenLine,
  Type as TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  ContractStatusBadge,
  type ContractStatus,
} from "@/components/contracts/ContractStatusBadge";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/contracts/SignaturePad";
import { renderTypedSignature } from "@/lib/typedSignature";
import { generateContractPdf } from "@/lib/contractPdf";
import { formatCurrencyBRL, formatDateBR, maskDocument, isValidDocument } from "@/lib/format";

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
  client_id: string;
  user_id: string;
  signer_name: string | null;
  signer_document: string | null;
  signer_birth_date: string | null;
  signer_display_name: string | null;
  signature_data: string | null;
  signature_type: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  clients: { full_name: string; document: string | null; email: string | null } | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  one_time: "À vista",
  installments: "Parcelado",
  recurring: "Recorrente",
};

const STEPS = [
  { id: 1, label: "Leitura" },
  { id: 2, label: "Dados" },
  { id: 3, label: "Assinatura" },
];

function PublicContractPage() {
  const { token } = Route.useParams();
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [providerName, setProviderName] = useState<string>("");
  const [providerLogo, setProviderLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1
  const [agreed, setAgreed] = useState(false);

  // Step 2
  const [signerName, setSignerName] = useState("");
  const [document, setDocumentValue] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Step 3
  const [signMode, setSignMode] = useState<"draw" | "type">("draw");
  const padRef = useRef<SignaturePadHandle>(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, contract_number, title, service_type, service_description, total_value, payment_method, start_date, end_date, clauses, status, client_id, user_id, signer_name, signer_document, signer_birth_date, signer_display_name, signature_data, signature_type, signed_at, signer_ip, clients(full_name, document, email)",
        )
        .eq("public_token", token)
        .maybeSingle();

      if (error) toast.error(error.message);
      const c = data as unknown as PublicContract | null;
      setContract(c);

      if (c) {
        setSignerName(c.signer_name || c.clients?.full_name || "");
        setDocumentValue(c.signer_document || c.clients?.document || "");
        setDisplayName(c.signer_display_name || c.signer_name || c.clients?.full_name || "");
        setBirthDate(c.signer_birth_date || "");

        // Fetch provider name + logo (public read of profiles is restricted; tolerate failure)
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, logo_url")
          .eq("user_id", c.user_id)
          .maybeSingle();
        if (profile?.full_name) setProviderName(profile.full_name);
        if (profile?.logo_url) setProviderLogo(profile.logo_url);
      }
      setLoading(false);
    })();
  }, [token]);

  // Keep displayName synced with signerName until user edits it
  useEffect(() => {
    if (!displayName && signerName) setDisplayName(signerName);
  }, [signerName, displayName]);

  const isSigned = contract?.status === "signed";
  const isCancelled = contract?.status === "cancelled";

  const validateStep2 = (): string | null => {
    if (!signerName.trim()) return "Informe seu nome completo";
    if (!isValidDocument(document)) return "CPF inválido";
    if (document.replace(/\D/g, "").length !== 11) return "Use CPF (11 dígitos)";
    if (!birthDate) return "Informe sua data de nascimento";
    if (!displayName.trim()) return 'Informe como deseja assinar';
    return null;
  };

  const goToStep2 = () => {
    if (!agreed) return;
    setStep(2);
  };

  const goToStep3 = () => {
    const err = validateStep2();
    if (err) {
      toast.error(err);
      return;
    }
    setStep(3);
  };

  const fetchClientIp = async (): Promise<string | null> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const json = await res.json();
      return typeof json.ip === "string" ? json.ip : null;
    } catch {
      return null;
    }
  };

  const handleSign = async () => {
    if (!contract) return;
    let signatureData = "";
    if (signMode === "draw") {
      if (padRef.current?.isEmpty()) {
        toast.error("Desenhe sua assinatura no quadro");
        return;
      }
      signatureData = padRef.current?.toDataURL() ?? "";
    } else {
      if (!displayName.trim()) {
        toast.error('Informe o nome para assinatura');
        return;
      }
      signatureData = renderTypedSignature(displayName);
    }

    setSigning(true);
    const ip = await fetchClientIp();

    const { data, error } = await supabase
      .from("contracts")
      .update({
        signer_name: signerName.trim(),
        signer_document: document,
        signer_birth_date: birthDate,
        signer_display_name: displayName.trim(),
        signature_data: signatureData,
        signature_type: signMode === "draw" ? "drawn" : "typed",
        signer_ip: ip,
        signed_at: new Date().toISOString(),
        status: "signed",
      })
      .eq("public_token", token)
      .select(
        "id, contract_number, title, service_type, service_description, total_value, payment_method, start_date, end_date, clauses, status, client_id, user_id, signer_name, signer_document, signer_birth_date, signer_display_name, signature_data, signature_type, signed_at, signer_ip, clients(full_name, document, email)",
      )
      .maybeSingle();

    setSigning(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contrato assinado com sucesso!");
    setContract(data as unknown as PublicContract);
  };

  const downloadPdf = async () => {
    if (!contract) return;
    const pdf = await generateContractPdf({
      ...contract,
      provider_name: providerName,
      provider_logo_url: providerLogo,
      client_name: contract.clients?.full_name ?? null,
    });
    pdf.save(`${contract.contract_number}.pdf`);
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

  return (
    <div className="min-h-screen bg-background pb-16">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 pt-8">
        {/* Provider + contract identity */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Prestador
            </div>
            <div className="text-sm font-medium">{providerName || "Prestador"}</div>
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>

        {/* Confirmation state */}
        {isSigned ? (
          <SignedConfirmation
            contract={contract}
            providerName={providerName}
            onDownload={downloadPdf}
          />
        ) : isCancelled ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            Este contrato foi cancelado pelo prestador.
          </div>
        ) : (
          <>
            <ProgressBar step={step} />

            <ContractDocument contract={contract} />

            {step === 1 && (
              <StepCard>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(c) => setAgreed(c === true)}
                  />
                  <Label htmlFor="agree" className="text-sm leading-relaxed">
                    Li e concordo com os termos do contrato acima.
                  </Label>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={goToStep2} disabled={!agreed}>
                    Continuar
                  </Button>
                </div>
              </StepCard>
            )}

            {step === 2 && (
              <StepCard title="Seus dados">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="full">Nome completo</Label>
                    <Input
                      id="full"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={document}
                      onChange={(e) => setDocumentValue(maskDocument(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth">Data de nascimento</Label>
                    <Input
                      id="birth"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="display">Assinar como</Label>
                    <Input
                      id="display"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nome que aparecerá na assinatura"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button onClick={goToStep3}>Continuar</Button>
                </div>
              </StepCard>
            )}

            {step === 3 && (
              <StepCard title="Assinatura digital">
                <Tabs value={signMode} onValueChange={(v) => setSignMode(v as "draw" | "type")}>
                  <TabsList className="grid w-full grid-cols-2 sm:w-80">
                    <TabsTrigger value="draw" className="gap-2">
                      <PenLine className="h-3.5 w-3.5" /> Desenhar
                    </TabsTrigger>
                    <TabsTrigger value="type" className="gap-2">
                      <TypeIcon className="h-3.5 w-3.5" /> Digitar nome
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="draw" className="mt-4">
                    <SignaturePad ref={padRef} />
                  </TabsContent>

                  <TabsContent value="type" className="mt-4">
                    <TypedPreview name={displayName} />
                  </TabsContent>
                </Tabs>

                <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  Ao assinar, registramos seu nome, CPF, data, hora e endereço IP como
                  prova da autenticidade da assinatura.
                </div>

                <div className="mt-5 flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button onClick={handleSign} disabled={signing} className="gap-2">
                    {signing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Assinar contrato
                  </Button>
                </div>
              </StepCard>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileSignature className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">ContratoFácil</span>
      </div>
    </header>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-6 rounded-2xl border border-border/70 bg-card/60 p-4">
      <div className="flex items-center gap-3">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  done
                    ? "bg-emerald-500/20 text-emerald-300"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={`text-xs sm:text-sm ${
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="h-px flex-1 bg-border/60" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContractDocument({ contract }: { contract: PublicContract }) {
  return (
    <article className="mb-6 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {contract.contract_number}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{contract.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{contract.service_type}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Field label="Cliente" value={contract.clients?.full_name ?? "—"} />
        <Field label="Valor" value={formatCurrencyBRL(Number(contract.total_value))} />
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
            Cláusulas do contrato
          </h2>
          <div className="prose-contract mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background/40 p-4 font-sans text-sm leading-relaxed text-foreground/90">
            {contract.clauses}
          </div>
        </section>
      )}
    </article>
  );
}

function StepCard({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
      {title && <h3 className="mb-4 text-base font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

function TypedPreview({ name }: { name: string }) {
  const dataUrl = useMemo(() => renderTypedSignature(name || " "), [name]);
  return (
    <div className="rounded-xl border border-border/70 bg-white p-4">
      <img
        src={dataUrl}
        alt="Pré-visualização da assinatura"
        className="mx-auto h-32 object-contain"
      />
      <p className="mt-2 text-center text-xs text-slate-500">
        Pré-visualização — sua assinatura tipográfica
      </p>
    </div>
  );
}

function SignedConfirmation({
  contract,
  providerName,
  onDownload,
}: {
  contract: PublicContract;
  providerName: string;
  onDownload: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-emerald-100">
          Contrato assinado com sucesso! ✅
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-emerald-200/80">
          Uma cópia do contrato assinado foi registrada com data, hora e IP. Você pode
          baixar o PDF abaixo.
        </p>
        <Button onClick={onDownload} className="mt-6 gap-2">
          <Download className="h-4 w-4" /> Baixar PDF do contrato
        </Button>
      </div>

      <ContractDocument contract={contract} />

      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <h3 className="mb-4 text-base font-semibold">Registro da assinatura</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {contract.signature_data && (
            <div className="sm:col-span-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assinatura
              </div>
              <div className="mt-2 rounded-xl border border-border/60 bg-white p-3">
                <img
                  src={contract.signature_data}
                  alt="Assinatura"
                  className="mx-auto h-28 object-contain"
                />
              </div>
            </div>
          )}
          <Field label="Assinado por" value={contract.signer_display_name ?? "—"} />
          <Field label="Nome completo" value={contract.signer_name ?? "—"} />
          <Field label="CPF" value={contract.signer_document ?? "—"} />
          <Field
            label="Data e hora"
            value={
              contract.signed_at
                ? new Date(contract.signed_at).toLocaleString("pt-BR")
                : "—"
            }
          />
          <Field label="IP de origem" value={contract.signer_ip ?? "—"} />
          <Field label="Prestador" value={providerName || "—"} />
        </div>
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
