import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface ClientRow {
  id: string;
  full_name: string;
}
interface ContractRow {
  id: string;
  contract_number: string;
  title: string;
  client_id: string;
}

type Frequency = "one_time" | "recurring";

export function InvoiceFormDialog({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hasPix, setHasPix] = useState<boolean | null>(null);
  const [country, setCountry] = useState<"BR" | "US">("BR");
  const isUS = country === "US";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("one_time");
  const [installments, setInstallments] = useState("1");
  const [indefinite, setIndefinite] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setClientId("");
    setContractId("none");
    setDescription("");
    setAmount("");
    setDueDate("");
    setFrequency("one_time");
    setInstallments("1");
    setIndefinite(false);

    void (async () => {
      const [clientsRes, contractsRes, pixRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name")
          .eq("user_id", user.id)
          .order("full_name"),
        supabase
          .from("contracts")
          .select("id, contract_number, title, client_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("pix_settings")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      setClients((clientsRes.data ?? []) as ClientRow[]);
      setContracts((contractsRes.data ?? []) as ContractRow[]);
      setHasPix(!!pixRes.data);
    })();
  }, [open, user]);

  const filteredContracts = clientId
    ? contracts.filter((c) => c.client_id === clientId)
    : contracts;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!clientId) return toast.error(t("invoices.form.errClient"));
    if (!description.trim()) return toast.error(t("invoices.form.errDescription"));
    const amountNum = parseFloat(amount.replace(",", "."));
    if (!amountNum || amountNum <= 0) return toast.error(t("invoices.form.errAmount"));
    if (!dueDate) return toast.error(t("invoices.form.errDueDate"));

    const recurrenceGroup =
      frequency === "recurring" ? crypto.randomUUID() : null;
    const total =
      frequency === "recurring"
        ? indefinite
          ? 12
          : Math.max(1, parseInt(installments) || 1)
        : 1;

    const baseDue = new Date(dueDate + "T00:00:00");
    const rows = Array.from({ length: total }).map((_, i) => {
      const d = new Date(baseDue);
      if (frequency === "recurring") d.setMonth(d.getMonth() + i);
      const iso = d.toISOString().slice(0, 10);
      return {
        user_id: user.id,
        client_id: clientId,
        contract_id: contractId === "none" ? null : contractId,
        description: description.trim(),
        amount: amountNum,
        due_date: iso,
        is_recurring: frequency === "recurring",
        installment_number: frequency === "recurring" ? i + 1 : null,
        installment_total:
          frequency === "recurring" ? (indefinite ? null : total) : null,
        recurrence_group: recurrenceGroup,
      };
    });

    setLoading(true);
    const { error } = await supabase.from("invoices").insert(rows);
    setLoading(false);

    if (error) return toast.error(error.message);

    toast.success(
      total > 1
        ? t("invoices.form.createdMany", { count: total })
        : t("invoices.form.createdOne"),
    );
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("invoices.form.createTitle")}</DialogTitle>
          <DialogDescription>{t("invoices.form.description")}</DialogDescription>
        </DialogHeader>

        {hasPix === false && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            {t("invoices.form.noPixWarning")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("invoices.form.client")} *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder={t("invoices.form.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {clients.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {t("invoices.form.registerClientFirst")}
                  </div>
                ) : (
                  clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("invoices.form.contract")}</Label>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger>
                <SelectValue placeholder={t("invoices.form.noContract")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("invoices.form.noContract")}</SelectItem>
                {filteredContracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.contract_number} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">{t("invoices.form.descriptionLabel")} *</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={255}
              placeholder={t("invoices.form.descriptionPlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("invoices.form.amount")} *</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">{t("invoices.form.dueDate")} *</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("invoices.form.type")}</Label>
            <RadioGroup
              value={frequency}
              onValueChange={(v) => setFrequency(v as Frequency)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm">
                <RadioGroupItem value="one_time" /> {t("invoices.form.single")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm">
                <RadioGroupItem value="recurring" /> {t("invoices.form.recurring")}
              </label>
            </RadioGroup>
          </div>

          {frequency === "recurring" && (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={indefinite}
                  onChange={(e) => setIndefinite(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                {t("invoices.form.indefinite")}
              </label>
              {!indefinite && (
                <div className="space-y-2">
                  <Label htmlFor="installments">{t("invoices.form.installments")}</Label>
                  <Input
                    id="installments"
                    type="number"
                    min={1}
                    max={60}
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("invoices.form.generate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
