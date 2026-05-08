import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Settings,
  Save,
  Sparkles,
  CreditCard,
  Upload,
  ExternalLink,
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/use-plan";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession, listInvoices, getStripeStatus } from "@/lib/billing.functions";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";
import { CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";

type KeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — ContratoFácil" }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <AppLayout>
      <SettingsPage />
    </AppLayout>
  );
}

interface InvoiceItem {
  id: string;
  number: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: string | null;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

function SettingsPage() {
  const { user } = useAuth();
  const { planInfo, currentPeriodEnd, cancelAtPeriodEnd, refresh } = usePlan();
  const { isAdmin } = useIsAdmin();
  const portalFn = useServerFn(createPortalSession);
  const invoicesFn = useServerFn(listInvoices);
  const stripeStatusFn = useServerFn(getStripeStatus);

  // Profile
  const [profileName, setProfileName] = useState("");
  const [accountType, setAccountType] = useState<string>("autonomo");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PIX
  const [pixLoading, setPixLoading] = useState(true);
  const [pixSaving, setPixSaving] = useState(false);
  const [pixId, setPixId] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("cpf");
  const [beneficiary, setBeneficiary] = useState("");
  const [city, setCity] = useState("");

  // Billing
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, account_type, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setProfileName(profile.full_name ?? "");
        setAccountType(profile.account_type ?? "autonomo");
        setLogoUrl(profile.logo_url ?? null);
      }
      // PIX
      setPixLoading(true);
      const { data: pix } = await supabase
        .from("pix_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (pix) {
        setPixId(pix.id);
        setPixKey(pix.pix_key);
        setKeyType(pix.key_type as KeyType);
        setBeneficiary(pix.beneficiary_name);
        setCity(pix.city);
      }
      setPixLoading(false);
    })();
  }, [user]);

  // Auto-refresh subscription on mount + after success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Assinatura ativada com sucesso!");
      void refresh();
      window.history.replaceState({}, "", "/configuracoes");
    }
    void loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const result = await invoicesFn();
      setInvoices(result.invoices as InvoiceItem[]);
    } catch {
      // ignore (may not have customer yet)
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileName.trim(),
        account_type: accountType as "mei" | "autonomo" | "prestador" | "liberal",
      })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!planInfo.limits.customLogo) {
      toast.error("Logo personalizado disponível no plano Pro");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploadingLogo(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    await supabase.from("profiles").update({ logo_url: url }).eq("user_id", user.id);
    setLogoUrl(url);
    setUploadingLogo(false);
    toast.success("Logo atualizado!");
  };

  const handleSavePix = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pixKey.trim()) return toast.error("Informe a chave PIX");
    if (!beneficiary.trim()) return toast.error("Informe o nome do beneficiário");
    if (!city.trim()) return toast.error("Informe a cidade");
    setPixSaving(true);
    const payload = {
      user_id: user.id,
      pix_key: pixKey.trim(),
      key_type: keyType,
      beneficiary_name: beneficiary.trim(),
      city: city.trim(),
    };
    const { error } = pixId
      ? await supabase.from("pix_settings").update(payload).eq("id", pixId)
      : await supabase.from("pix_settings").insert(payload);
    setPixSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Chave PIX salva!");
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const result = await portalFn();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir portal";
      toast.error(msg);
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Perfil, plano, recebimento via PIX e personalização da sua marca.
        </p>
      </div>

      {/* Profile */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-6 rounded-2xl border border-border/70 bg-card p-6"
      >
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Dados do perfil</h2>
            <p className="text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mei">MEI</SelectItem>
                <SelectItem value="autonomo">Autônomo</SelectItem>
                <SelectItem value="prestador">Prestador de serviço</SelectItem>
                <SelectItem value="liberal">Profissional liberal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={savingProfile} className="gap-2">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar perfil
          </Button>
        </div>
      </form>

      {/* Plan */}
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold">Plano e assinatura</h2>
            <p className="text-xs text-muted-foreground">
              Gerencie seu plano e veja seu histórico de pagamentos.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{planInfo.name}</span>
              <Badge variant="secondary">
                {planInfo.monthlyPriceBRL > 0 ? `R$${planInfo.monthlyPriceBRL}/mês` : "Grátis"}
              </Badge>
              {cancelAtPeriodEnd && <Badge variant="destructive">Cancelando</Badge>}
            </div>
            {currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {cancelAtPeriodEnd ? "Acesso até" : "Próxima renovação em"}{" "}
                {formatDateBR(currentPeriodEnd)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/planos">
                <Sparkles className="h-4 w-4" /> Ver planos
              </Link>
            </Button>
            {planInfo.id !== "free" && (
              <Button onClick={handleManageSubscription} disabled={openingPortal} className="gap-2">
                {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Gerenciar assinatura
              </Button>
            )}
          </div>
        </div>

        {/* Invoices */}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Histórico de faturas</h3>
            <Button variant="ghost" size="sm" onClick={loadInvoices} disabled={invoicesLoading}>
              {invoicesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
            </Button>
          </div>
          {invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
              {invoicesLoading ? "Carregando..." : "Nenhuma fatura ainda."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Número</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Valor</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-border/40">
                      <td className="px-3 py-2 font-mono text-xs">{inv.number ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDateBR(new Date(inv.created * 1000).toISOString())}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrencyBRL((inv.amount_paid || inv.amount_due) / 100)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                          {inv.status ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inv.invoice_pdf && (
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ImageIcon className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold">Logo personalizado</h2>
            <p className="text-xs text-muted-foreground">
              Aparece no topo dos seus contratos em PDF.
            </p>
          </div>
          {!planInfo.limits.customLogo && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Pro
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border/60 bg-muted/30">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!planInfo.limits.customLogo || uploadingLogo}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {logoUrl ? "Trocar logo" : "Enviar logo"}
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG ou SVG até 2MB.</p>
            {!planInfo.limits.customLogo && (
              <Link to="/planos" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Sparkles className="h-3 w-3" /> Faça upgrade para o plano Pro
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* PIX */}
      <form
        onSubmit={handleSavePix}
        className="space-y-6 rounded-2xl border border-border/70 bg-card p-6"
      >
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Recebimento via PIX</h2>
            <p className="text-xs text-muted-foreground">
              Esses dados aparecerão na página de pagamento dos seus clientes.
            </p>
          </div>
        </div>
        {pixLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo da chave *</Label>
                <Select value={keyType} onValueChange={(v) => setKeyType(v as KeyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Chave PIX *</Label>
                <Input
                  id="key"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave PIX"
                  maxLength={120}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ben">Nome do beneficiário *</Label>
                <Input
                  id="ben"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  maxLength={25}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo de 25 caracteres (limite do PIX).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={15}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pixSaving} className="gap-2">
                {pixSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar PIX
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
