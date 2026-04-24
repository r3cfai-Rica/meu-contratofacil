import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSignature, QrCode, Users, Plus, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ContratoFácil" },
      { name: "description", content: "Painel de controle do ContratoFácil." },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}

const stats = [
  { label: "Contratos ativos", value: "0", icon: FileSignature },
  { label: "Cobranças pendentes", value: "R$ 0,00", icon: QrCode },
  { label: "Clientes", value: "0", icon: Users },
];

function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <span>
              Contrato<span className="text-primary">Fácil</span>
            </span>
          </Link>
          <Button size="sm" variant="ghost" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá{fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Aqui está um resumo da sua atividade.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Novo contrato
          </Button>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border/70 bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/50 p-12 text-center">
          <h2 className="text-lg font-semibold">Nada por aqui ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Comece criando seu primeiro contrato para ver as informações aparecerem no painel.
          </p>
          <Button className="mt-6 gap-2">
            <Plus className="h-4 w-4" /> Criar primeiro contrato
          </Button>
        </section>
      </main>
    </div>
  );
}
