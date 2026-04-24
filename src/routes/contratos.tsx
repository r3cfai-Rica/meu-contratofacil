import { createFileRoute } from "@tanstack/react-router";
import { FileSignature } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos — ContratoFácil" }] }),
  component: () => (
    <AppLayout>
      <PlaceholderModule
        icon={<FileSignature className="h-5 w-5" />}
        title="Contratos"
        description="Em breve você poderá criar, enviar e assinar contratos digitais por aqui."
      />
    </AppLayout>
  ),
});

function PlaceholderModule({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-12 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          {icon}
        </span>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
