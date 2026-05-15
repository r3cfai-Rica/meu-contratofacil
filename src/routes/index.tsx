import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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

function LandingPage() {
  const { t } = useTranslation();

  const benefits = [
    { icon: FileSignature, title: t("landing.feature1Title"), description: t("landing.feature1Desc") },
    { icon: QrCode, title: t("landing.feature2Title"), description: t("landing.feature2Desc") },
    { icon: Users, title: t("landing.feature3Title"), description: t("landing.feature3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("landing.badge")}
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            {t("landing.headline1")}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              {t("landing.headline2")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t("landing.subhead")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link to="/signup">
                {t("landing.ctaStart")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/login">{t("nav.haveAccount")}</Link>
            </Button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> {t("landing.trust")}
          </p>
        </div>
      </section>

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

        <div className="mt-16 rounded-3xl border border-border/70 bg-card p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("landing.finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            {t("landing.finalCtaDesc")}
          </p>
          <Button asChild size="lg" className="mt-6 gap-2">
            <Link to="/signup">
              {t("landing.ctaStart")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("common.brandPrefix")}{t("common.brandSuffix")}. {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}
