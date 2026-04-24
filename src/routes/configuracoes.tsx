import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — ContratoFácil" }] }),
  component: () => (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-12 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Settings className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold">Configurações</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Em breve: ajustes da sua conta, preferências e integrações.
          </p>
        </div>
      </div>
    </AppLayout>
  ),
});
