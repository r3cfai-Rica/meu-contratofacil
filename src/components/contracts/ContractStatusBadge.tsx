import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ContractStatus =
  | "draft"
  | "sent"
  | "awaiting_signature"
  | "signed"
  | "cancelled";

const LABELS: Record<ContractStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  awaiting_signature: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
};

const STYLES: Record<ContractStatus, string> = {
  draft: "bg-muted text-muted-foreground border border-border/60",
  sent: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  awaiting_signature: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
  signed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-300 border border-red-500/30",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {LABELS[status]}
    </Badge>
  );
}

export const CONTRACT_STATUS_LABELS = LABELS;
