import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Send, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { sendContractEmail } from "@/lib/email.functions";
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
import { getDefaultContractClausesList, joinClauses } from "@/lib/contractTemplate";

type ContractLang = "pt-BR" | "en-US";

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
  const { t, i18n } = useTranslation();
  const currentLang: "pt-BR" | "en-US" =
    i18n.language?.toLowerCase().startsWith("en") ? "en-US" : "pt-BR";
  const sendEmail = useServerFn(sendContractEmail);
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
  const [contractLang, setContractLang] = useState<ContractLang>(currentLang);
  const [clausesTouched, setClausesTouched] = useState(false);
  const [clauses, setClauses] = useState<string[]>(getDefaultContractClausesList(currentLang));

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
      setContractLang(currentLang);
      setClausesTouched(false);
      setClauses(getDefaultContractClauses(currentLang));
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
    if (!clientId) return t("contracts.form.errSelectClient");
    if (!title.trim()) return t("contracts.form.errTitle");
    if (!serviceType.trim()) return t("contracts.form.errServiceType");
    if (!startDate) return t("contracts.form.errStartDate");
    const value = parseFloat(totalValue.replace(",", "."));
    if (isNaN(value) || value < 0) return t("contracts.form.errInvalidValue");
    if (endDate && endDate < startDate) return t("contracts.form.errEndBeforeStart");
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

    if (sendForSignature && data?.id) {
      try {
        const result = await sendEmail({
          data: {
            contractId: data.id,
            appOrigin: window.location.origin,
            language: contractLang,
          },
        });
        toast.success(t("contracts.form.sentToEmail", { recipient: result.recipient }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("contracts.form.errSendEmail");
        toast.error(t("contracts.form.emailFailed", { message: msg }));
      }
    } else if (!sendForSignature) {
      toast.success(t("contracts.form.draftSaved"));
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
          <DialogTitle>{t("contracts.form.createTitle")}</DialogTitle>
          <DialogDescription>{t("contracts.form.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">{t("contracts.form.client")} *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder={t("contracts.form.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {clientsList.length === 0 ? (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    {t("contracts.form.noClients")}
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
            <Label htmlFor="title">{t("contracts.form.titleLabel")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("contracts.form.titlePlaceholder")}
              maxLength={150}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_type">{t("contracts.form.serviceType")} *</Label>
            <Input
              id="service_type"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder={t("contracts.form.serviceTypePlaceholder")}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_description">{t("contracts.form.serviceDescription")}</Label>
            <Textarea
              id="service_description"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t("contracts.form.serviceDescriptionPlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_value">{t("contracts.form.totalValue")} *</Label>
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
              <Label htmlFor="payment_method">{t("contracts.form.paymentMethod")}</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">{t("contracts.form.oneTime")}</SelectItem>
                  <SelectItem value="installments">{t("contracts.form.installments")}</SelectItem>
                  <SelectItem value="recurring">{t("contracts.form.recurring")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("contracts.form.startDate")} *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">{t("contracts.form.endDate")}</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_language">{t("contracts.form.contractLanguage")}</Label>
            <Select
              value={contractLang}
              onValueChange={(v) => {
                const next = v as ContractLang;
                setContractLang(next);
                if (!clausesTouched) {
                  setClauses(getDefaultContractClauses(next));
                }
              }}
            >
              <SelectTrigger id="contract_language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">{t("contracts.form.langPt")}</SelectItem>
                <SelectItem value="en-US">{t("contracts.form.langEn")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("contracts.form.contractLanguageHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clauses">{t("contracts.form.clauses")}</Label>
            <Textarea
              id="clauses"
              value={clauses}
              onChange={(e) => {
                setClausesTouched(true);
                setClauses(e.target.value);
              }}
              rows={10}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">{t("contracts.form.clausesHint")}</p>
          </div>


          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="secondary" disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("contracts.form.saveDraft")}
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
              {t("contracts.form.sendForSignature")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
