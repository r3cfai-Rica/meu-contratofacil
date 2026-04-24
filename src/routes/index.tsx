import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileSignature, QrCode, Users, ShieldCheck, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ContratoFácil — Contratos, cobranças e clientes em um só lugar" },
      {
        name: "description",
        content:
          "SaaS para MEIs, autônomos e prestadores de serviço gerenciarem contratos digitais, cobranças via PIX e clientes com simplicidade.",
      },
      {
        property: "og:title",
        content: "ContratoFácil — Contratos, cobranças e clientes em um só lugar",
      },
      {
        property: "og:description",
        content:
          "Gerencie contratos digitais, receba via PIX e organize seus clientes em uma única plataforma feita para o profissional brasileiro.",
      },
    ],
  }),
  component: LandingPage,
});

const benefits = [
  {
    icon: FileSignature,
    title: "Contratos digitais",
    description:
      "Crie, envie e assine contratos com validade jurídica em minutos. Modelos prontos para serviços recorrentes.",
  },
  {
    icon: QrCode,
    title: "Cobrança via PIX",
    description:
      "Gere cobranças automáticas por PIX, acompanhe pagamentos em tempo real e reduza a inadimplência.",
  },
  {
    icon: Users,
    title: "Gestão de clientes",
    description:
      "Centralize histórico, contratos e pagamentos de cada cliente em um painel simples e organizado.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Feito para MEIs, autônomos e prestadores de serviço
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Seus contratos, cobranças e clientes.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              Tudo em um lugar.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            ContratoFácil é a plataforma que descomplica a parte burocrática do seu negócio para
            você focar no que importa: atender bem e crescer.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link to="/signup">
                Começar grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border/70 bg-card p-6 transition hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="mt-16 rounded-3xl border border-border/70 bg-card p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pronto para profissionalizar seu negócio?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Crie sua conta gratuita e comece a enviar contratos e cobranças hoje mesmo.
          </p>
          <Button asChild size="lg" className="mt-6 gap-2">
            <Link to="/signup">
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ContratoFácil. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
