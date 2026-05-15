import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: "clientes" | "contratos" | "cobranças";
  limit: number;
}

export function UpgradeDialog({ open, onOpenChange, resource, limit }: UpgradeDialogProps) {
  const { t } = useTranslation();
  const resourceKey = resource === "cobranças" ? "cobrancas" : resource;
  const resourceLabel = t(`upgrade.resources.${resourceKey}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">{t("upgrade.title")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("upgrade.description", { limit, resource: resourceLabel })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="font-semibold text-primary">{t("upgrade.proTitle")}</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• {t("upgrade.benefit1")}</li>
            <li>• {t("upgrade.benefit2")}</li>
            <li>• {t("upgrade.benefit3")}</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("upgrade.later")}
          </Button>
          <Button asChild className="gap-2">
            <Link to="/planos" onClick={() => onOpenChange(false)}>
              <Sparkles className="h-4 w-4" />
              {t("upgrade.viewPlans")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
