import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Send, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_CONTRACT_CLAUSES } from "@/lib/contractTemplate";

interface ClientOption {
  id: string;
  full_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (info?: { publicToken?: string; contractNumber?: string }) => void;
}

type PaymentMethod = "one_time" | "installments" | "recurring";

export function ContractFormDialog({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientsList, setClientsList] = useState<ClientOption[]>([]);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("one_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clauses, setClauses] = useState(DEFAULT_CONTRACT_CLAUSES);

  useEffect(() => {
    if (!open) {
      setClientId("");
      setTitle("");
      setServiceType("");
      setServiceDescription("");
      setTotalValue("");
      setPaymentMethod("one_time");
      setStartDate("");
      setEndDate("");
      setClauses(DEFAULT_CONTRACT_CLAUSES);
      return;
    }
    if (!user) return;
    supabase
      .from("clients")
      .select("id, full_name")
      .eq("user_id", user.id)
      .order("full_name")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setClientsList(data ?? []);
      });
  }, [open, user]);

  const validate = () => {
    if (!clientId) return "Selecione um cliente";
    if (!title.trim()) return "Informe o título do contrato";
    if (!serviceType.trim()) return "Informe o tipo de serviço";
    if (!startDate) return "Informe a data de início";
    const value = parseFloat(totalValue.replace(",", "."));
    if (isNaN(value) || value < 0) return "Valor total inválido";
    if (endDate && endDate < startDate) return "Data de término anterior à de início";
    return null;
  };

  const submit = async (sendForSignature: boolean) => {
    if (!user) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);

    const value = parseFloat(totalValue.replace(",", "."));
    const publicToken = sendForSignature ? crypto.randomUUID() : null;

    const { data, error } = await supabase
      .from("contracts")
      .insert({
        user_id: user.id,
        client_id: clientId,
        title: title.trim(),
        service_type: serviceType.trim(),
        service_description: serviceDescription.trim() || null,
        total_value: value,
        payment_method: paymentMethod,
        start_date: startDate,
        end_date: endDate || null,
        clauses: clauses.trim() || null,
        status: sendForSignature ? "awaiting_signature" : "draft",
        public_token: publicToken,
      })
      .select("id, contract_number, public_token")
      .single();

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (sendForSignature) {
      toast.success("Contrato enviado para assinatura!");
    } else {
      toast.success("Rascunho salvo");
    }
    onOpenChange(false);
    onSaved({
      publicToken: data?.public_token ?? undefined,
      contractNumber: data?.contract_number,
    });
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo contrato</DialogTitle>
          <DialogDescription>
            Preencha os dados do contrato. Você pode salvar como rascunho ou enviar para
            assinatura.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientsList.length === 0 ? (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    Nenhum cliente cadastrado
                  </div>
                ) : (
                  clientsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título do contrato *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Desenvolvimento de website institucional"
              maxLength={150}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_type">Tipo de serviço *</Label>
            <Input
              id="service_type"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="Ex.: Consultoria, Design, Desenvolvimento"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_description">Descrição detalhada do serviço</Label>
            <Textarea
              id="service_description"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Descreva o escopo, entregas e prazos do serviço."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_value">Valor total (R$) *</Label>
              <Input
                id="total_value"
                type="number"
                step="0.01"
                min="0"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">À vista</SelectItem>
                  <SelectItem value="installments">Parcelado</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de início *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data de término (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clauses">Cláusulas do contrato</Label>
            <Textarea
              id="clauses"
              value={clauses}
              onChange={(e) => setClauses(e.target.value)}
              rows={10}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Template padrão pré-preenchido. Edite conforme necessário.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="secondary" disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar rascunho
            </Button>
            <Button
              type="button"
              onClick={() => void submit(true)}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar para assinatura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
