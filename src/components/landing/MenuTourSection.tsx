import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  FileSignature,
  QrCode,
  UsersRound,
  Sparkles,
  Settings,
} from "lucide-react";
import dashboardImg from "@/assets/menu-tour/01-dashboard.png";
import clientesImg from "@/assets/menu-tour/02-clientes.png";
import contratosImg from "@/assets/menu-tour/03-contratos.png";
import cobrancasImg from "@/assets/menu-tour/04-cobrancas.png";
import equipeImg from "@/assets/menu-tour/05-equipe.png";
import planosImg from "@/assets/menu-tour/06-planos.png";
import configuracoesImg from "@/assets/menu-tour/07-configuracoes.png";

const items = [
  { key: "dashboard", img: dashboardImg, Icon: LayoutDashboard },
  { key: "clientes", img: clientesImg, Icon: Users },
  { key: "contratos", img: contratosImg, Icon: FileSignature },
  { key: "cobrancas", img: cobrancasImg, Icon: QrCode },
  { key: "equipe", img: equipeImg, Icon: UsersRound },
  { key: "planos", img: planosImg, Icon: Sparkles },
  { key: "configuracoes", img: configuracoesImg, Icon: Settings },
] as const;

export function MenuTourSection() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {t("landing.tour.eyebrow")}
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("landing.tour.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("landing.tour.subtitle")}
        </p>
      </div>

      <div className="mt-12 space-y-16">
        {items.map(({ key, img, Icon }, idx) => {
          const reverse = idx % 2 === 1;
          return (
            <article
              key={key}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            >
              <div className={reverse ? "lg:order-2" : ""}>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                  {t(`landing.tour.items.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t(`landing.tour.items.${key}.desc`)}
                </p>
              </div>

              <div
                className={
                  "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-glow)] " +
                  (reverse ? "lg:order-1" : "")
                }
              >
                <img
                  src={img}
                  alt={t(`landing.tour.items.${key}.title`)}
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
