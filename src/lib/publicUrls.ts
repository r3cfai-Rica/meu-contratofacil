// URL pública estável do app publicado. Nunca usar URLs de preview do Lovable
// (id-preview--*.lovable.app, *-dev.lovable.app, *.lovableproject.com) em links
// enviados a clientes — essas URLs exigem login no Lovable.
export const PUBLIC_APP_URL = "https://meu-contrato-na-mao.lovable.app";

export type AppLang = "pt-BR" | "en-US";

function normalizeLang(lang: string | undefined | null): AppLang {
  return lang && lang.toLowerCase().startsWith("en") ? "en-US" : "pt-BR";
}

export function buildContractSignUrl(token: string, lang?: string | null): string {
  const l = normalizeLang(lang);
  return `${PUBLIC_APP_URL}/c/${token}?lang=${encodeURIComponent(l)}`;
}

export function buildInvoicePayUrl(token: string, lang?: string | null): string {
  const l = normalizeLang(lang);
  return `${PUBLIC_APP_URL}/pagar/${token}?lang=${encodeURIComponent(l)}`;
}
