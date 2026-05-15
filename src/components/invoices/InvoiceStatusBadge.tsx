import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

const STYLES: Record<InvoiceStatus, string> = {
  pending:
    "bg-yellow-500/15 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/20",
  paid:
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20",
  overdue:
    "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/20",
  cancelled:
    "bg-slate-500/15 text-slate-300 border-slate-500/30 hover:bg-slate-500/20",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {t(`invoices.status.${status}`)}
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
