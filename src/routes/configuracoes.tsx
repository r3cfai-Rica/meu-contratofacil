import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [pixKey, setPixKey] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("cpf");
  const [beneficiary, setBeneficiary] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pix_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setPixKey(data.pix_key);
        setKeyType(data.key_type as KeyType);
        setBeneficiary(data.beneficiary_name);
        setCity(data.city);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pixKey.trim()) return toast.error("Informe a chave PIX");
    if (!beneficiary.trim()) return toast.error("Informe o nome do beneficiário");
    if (!city.trim()) return toast.error("Informe a cidade");

    setSaving(true);
    const payload = {
      user_id: user.id,
      pix_key: pixKey.trim(),
      key_type: keyType,
      beneficiary_name: beneficiary.trim(),
      city: city.trim(),
    };
    const { error } = existingId
      ? await supabase.from("pix_settings").update(payload).eq("id", existingId)
      : await supabase.from("pix_settings").insert(payload);
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Configure sua chave PIX para receber pagamentos dos clientes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
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

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo da chave *</Label>
                <Select
                  value={keyType}
                  onValueChange={(v) => setKeyType(v as KeyType)}
                >
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
                  placeholder="Como aparece no recibo"
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
                  placeholder="Ex: São Paulo"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar configurações
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
