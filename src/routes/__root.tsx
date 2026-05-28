import { useEffect } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import i18n, { getBrowserLanguage, resetServerLanguage } from "@/lib/i18n";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ContratoFácil" },
      {
        name: "description",
        content:
          "ContratoFácil: contratos digitais, cobranças via PIX e gestão de clientes em uma só plataforma para MEIs, autônomos e prestadores de serviço no Brasil.",
      },
      { name: "author", content: "ContratoFácil" },
      { property: "og:site_name", content: "ContratoFácil" },
      { property: "og:title", content: "ContratoFácil" },
      {
        property: "og:description",
        content:
          "Contratos digitais, cobranças via PIX e gestão de clientes em uma só plataforma para MEIs, autônomos e prestadores de serviço.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ContratoFácil" },
      {
        name: "twitter:description",
        content:
          "Contratos digitais, cobranças via PIX e gestão de clientes em uma só plataforma para MEIs, autônomos e prestadores de serviço.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ContratoFácil",
          url: "https://contratofacil.r3cf.com",
          description:
            "Plataforma de contratos digitais, cobranças via PIX e gestão de clientes para MEIs, autônomos e prestadores de serviço.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Reset i18n to default on every server render — the singleton state
  // can leak across requests in the Worker isolate and cause hydration mismatches.
  resetServerLanguage();
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    const nextLanguage = getBrowserLanguage();

    document.documentElement.lang = nextLanguage;

    if (i18n.resolvedLanguage !== nextLanguage) {
      void i18n.changeLanguage(nextLanguage);
    }
  }, []);

  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
