import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">Limite do plano grátis atingido</DialogTitle>
          <DialogDescription className="text-base">
            Você atingiu o limite de <strong>{limit} {resource}</strong> do plano grátis.
            Faça upgrade para continuar criando sem limites.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="font-semibold text-primary">Plano Pro — R$49/mês</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• Clientes, contratos e cobranças ilimitados</li>
            <li>• Logo personalizado nos contratos</li>
            <li>• Lembretes automáticos de vencimento</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
          <Button asChild className="gap-2">
            <Link to="/planos" onClick={() => onOpenChange(false)}>
              <Sparkles className="h-4 w-4" />
              Ver planos
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
