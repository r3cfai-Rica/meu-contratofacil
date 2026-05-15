import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ContractStatus =
  | "draft"
  | "sent"
  | "awaiting_signature"
  | "signed"
  | "cancelled";

const STYLES: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground border border-border/60",
  sent: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  awaiting_signature: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
  signed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-300 border border-red-500/30",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {t(`contracts.status.${status}`)}
    </Badge>
  );
}

export function useContractStatusLabels(): Record<ContractStatus, string> {
  const { t } = useTranslation();
  return {
    draft: t("contracts.status.draft"),
    sent: t("contracts.status.sent"),
    awaiting_signature: t("contracts.status.awaiting_signature"),
    signed: t("contracts.status.signed"),
    cancelled: t("contracts.status.cancelled"),
  };
}

// Backwards-compatible static labels (Portuguese fallback).
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  awaiting_signature: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};
