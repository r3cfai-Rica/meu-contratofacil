import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSupabaseAccessToken } from "@/integrations/supabase/server-fn-auth";
import { buildInvoicePayUrl } from "@/lib/publicUrls";

const FROM = "ContratoFácil <contratos@r3cf.com>";

const InputSchema = z.object({
  invoiceId: z.string().uuid(),
  language: z.enum(["pt-BR", "en-US"]).optional().default("pt-BR"),
});

type Lang = "pt-BR" | "en-US";

function formatMoney(value: number, currency: string, lang: Lang) {
  const cur = currency === "USD" ? "USD" : "BRL";
  return value.toLocaleString(lang === "en-US" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: cur,
  });
}
function formatDate(value: string, lang: Lang) {
  return new Date(value + "T00:00:00").toLocaleDateString(
    lang === "en-US" ? "en-US" : "pt-BR",
  );
}
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const T = {
  "pt-BR": {
    htmlLang: "pt-BR",
    brand: "ContratoFácil",
    hello: (n: string) => `Olá, ${n}!`,
    intro: (p: string) =>
      `<strong>${p}</strong> enviou uma cobrança para você. Clique no botão abaixo para visualizar e efetuar o pagamento de forma segura.`,
    invoiceLabel: "Cobrança",
    amountLabel: "Valor:",
    dueLabel: "Vencimento:",
    cta: "Visualizar e pagar",
    copyLink: "Ou copie este link no navegador:",
    footer: (p: string) =>
      `Em caso de dúvidas, basta responder este email.<br/>Enviado por ${p} via ContratoFácil.`,
    subject: (p: string) => `${p} enviou uma cobrança para você`,
  },
  "en-US": {
    htmlLang: "en",
    brand: "EasyContract",
    hello: (n: string) => `Hello, ${n}!`,
    intro: (p: string) =>
      `<strong>${p}</strong> sent you an invoice. Click the button below to view it and pay securely.`,
    invoiceLabel: "Invoice",
    amountLabel: "Amount:",
    dueLabel: "Due date:",
    cta: "View and pay",
    copyLink: "Or copy this link into your browser:",
    footer: (p: string) =>
      `If you have any questions, just reply to this email.<br/>Sent by ${p} via EasyContract.`,
    subject: (p: string) => `${p} sent you an invoice`,
  },
} as const;

function buildHtml(params: {
  clientName: string;
  providerName: string;
  providerLogoUrl: string | null;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
  payUrl: string;
  language: Lang;
}) {
  const {
    clientName,
    providerName,
    providerLogoUrl,
    description,
    amount,
    currency,
    dueDate,
    payUrl,
    language,
  } = params;
  const tr = T[language];

  return `<!doctype html>
<html lang="${tr.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(description)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              ${
                providerLogoUrl
                  ? `<img src="${escapeHtml(providerLogoUrl)}" alt="${escapeHtml(providerName)}" style="max-height:56px;max-width:200px;margin-bottom:8px;" />`
                  : `<div style="font-size:18px;font-weight:600;color:#1a1a1a;">${escapeHtml(providerName)}</div>`
              }
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1a1a1a;line-height:1.3;">
                ${escapeHtml(tr.hello(clientName))}
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a3a3a;">
                ${tr.intro(escapeHtml(providerName))}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9fb;border:1px solid #ececef;border-radius:12px;padding:20px;">
                <tr>
                  <td style="font-size:13px;color:#6b6b70;padding-bottom:6px;">${tr.invoiceLabel}</td>
                </tr>
                <tr>
                  <td style="font-size:16px;font-weight:600;color:#1a1a1a;padding-bottom:14px;">
                    ${escapeHtml(description)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:6px;">
                    <span style="font-size:13px;color:#6b6b70;">${tr.amountLabel} </span>
                    <span style="font-size:14px;font-weight:600;color:#1a1a1a;">${escapeHtml(formatMoney(amount, currency, language))}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size:13px;color:#6b6b70;">${tr.dueLabel} </span>
                    <span style="font-size:14px;color:#1a1a1a;">${escapeHtml(formatDate(dueDate, language))}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="${escapeHtml(payUrl)}"
                 style="display:inline-block;background-color:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
                ${tr.cta}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a8a8e;line-height:1.5;">
                ${tr.copyLink}<br/>
                <a href="${escapeHtml(payUrl)}" style="color:#3a3a3a;word-break:break-all;">${escapeHtml(payUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#f9f9fb;border-top:1px solid #ececef;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a8a8e;line-height:1.5;">
                ${tr.footer(escapeHtml(providerName))}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([withSupabaseAccessToken, requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");

    const language: Lang = data.language ?? "pt-BR";
    const tr = T[language];

    const { data: invoice, error: iErr } = await supabase
      .from("invoices")
      .select(
        "id, user_id, client_id, description, amount, currency, due_date, public_token",
      )
      .eq("id", data.invoiceId)
      .maybeSingle();

    if (iErr) throw new Error(iErr.message);
    if (!invoice) throw new Error("Cobrança não encontrada");
    if (invoice.user_id !== userId) throw new Error("Acesso negado");
    if (!invoice.public_token)
      throw new Error("Cobrança sem link público de pagamento");

    const [{ data: client, error: clErr }, { data: profile }] = await Promise.all([
      supabase
        .from("clients")
        .select("full_name, email")
        .eq("id", invoice.client_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, logo_url")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (clErr) throw new Error(clErr.message);
    if (!client) throw new Error("Cliente não encontrado");
    if (!client.email)
      throw new Error(
        "Cliente sem email cadastrado. Cadastre um email para o cliente antes de enviar.",
      );

    const providerName =
      profile?.full_name?.trim() ||
      (language === "en-US" ? "Your provider" : "Seu prestador");

    const payUrl = buildInvoicePayUrl(invoice.public_token, language);

    const html = buildHtml({
      clientName: client.full_name,
      providerName,
      providerLogoUrl: profile?.logo_url ?? null,
      description: invoice.description,
      amount: Number(invoice.amount),
      currency: invoice.currency ?? "BRL",
      dueDate: invoice.due_date,
      payUrl,
      language,
    });

    const subject = tr.subject(providerName);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [client.email],
        subject,
        html,
      }),
    });

    const respJson = (await resp.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!resp.ok) {
      const msg = respJson.message || respJson.name || `HTTP ${resp.status}`;
      throw new Error(`Falha ao enviar email: ${msg}`);
    }

    return { ok: true, messageId: respJson.id ?? null, recipient: client.email };
  });
