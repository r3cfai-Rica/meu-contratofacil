import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  FileSignature,
  Wallet,
  Clock,
  Plus,
  ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";

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
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}

interface Stats {
  clients: number;
  activeContracts: number;
  pendingAmount: number;
  awaitingSignature: number;
}

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    activeContracts: 0,
    pendingAmount: 0,
    awaitingSignature: 0,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        setStats((s) => ({ ...s, clients: count ?? 0 }));
      });
  }, [user]);

  const cards = [
    {
      label: "Clientes cadastrados",
      value: stats.clients.toString(),
      icon: Users,
    },
    {
      label: "Contratos ativos",
      value: stats.activeContracts.toString(),
      icon: FileSignature,
    },
    {
      label: "Valor a receber",
      value: formatCurrencyBRL(stats.pendingAmount),
      icon: Wallet,
    },
    {
      label: "Aguardando assinatura",
      value: stats.awaitingSignature.toString(),
      icon: Clock,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do seu negócio em tempo real.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/clientes">
            <Plus className="h-4 w-4" /> Novo cliente
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/70 bg-card p-5 transition hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
          </div>
        ))}
      </section>

      {/* Lists */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ListCard
          title="Últimos contratos"
          emptyText="Você ainda não tem contratos."
          actionLabel="Criar contrato"
          actionTo="/contratos"
          items={[]}
        />
        <ListCard
          title="Próximas cobranças"
          emptyText="Nenhuma cobrança a vencer."
          actionLabel="Criar cobrança"
          actionTo="/cobrancas"
          items={[]}
        />
      </section>
    </div>
  );
}

interface ListItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  date: string;
}

function ListCard({
  title,
  emptyText,
  actionLabel,
  actionTo,
  items,
}: {
  title: string;
  emptyText: string;
  actionLabel: string;
  actionTo: "/contratos" | "/cobrancas";
  items: ListItem[];
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button asChild size="sm" variant="ghost" className="gap-1 text-xs">
          <Link to={actionTo}>
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.subtitle}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{item.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateBR(item.date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
