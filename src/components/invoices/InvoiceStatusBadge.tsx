import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

const map: Record<InvoiceStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className:
      "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20",
  },
  paid: {
    label: "Pago",
    className:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20",
  },
  overdue: {
    label: "Vencido",
    className:
      "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/20",
  },
  cancelled: {
    label: "Cancelado",
    className:
      "bg-slate-500/15 text-slate-300 border-slate-500/30 hover:bg-slate-500/20",
  },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = map[status];
  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}

export function getEffectiveStatus(
  status: InvoiceStatus,
  dueDate: string,
): InvoiceStatus {
  if (status !== "pending") return status;
  const due = new Date(dueDate + "T23:59:59");
  return due.getTime() < Date.now() ? "overdue" : "pending";
}
