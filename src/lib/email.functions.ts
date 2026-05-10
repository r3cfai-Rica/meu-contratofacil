import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSupabaseAccessToken } from "@/integrations/supabase/server-fn-auth";

const FROM = "ContratoFácil <contratos@r3cf.com>";

const InputSchema = z.object({
  contractId: z.string().uuid(),
  appOrigin: z.string().url(),
});

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(params: {
  clientName: string;
  providerName: string;
  providerLogoUrl: string | null;
  contractNumber: string;
  title: string;
  totalValue: number;
  startDate: string;
  signUrl: string;
}) {
  const {
    clientName,
    providerName,
    providerLogoUrl,
    contractNumber,
    title,
    totalValue,
    startDate,
    signUrl,
  } = params;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
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
                Olá, ${escapeHtml(clientName)}!
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3a3a3a;">
                <strong>${escapeHtml(providerName)}</strong> enviou um contrato para sua assinatura digital. Revise os termos e assine diretamente pelo navegador, do computador ou celular.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f9fb;border:1px solid #ececef;border-radius:12px;padding:20px;">
                <tr>
                  <td style="font-size:13px;color:#6b6b70;padding-bottom:6px;">Contrato</td>
                </tr>
                <tr>
                  <td style="font-size:16px;font-weight:600;color:#1a1a1a;padding-bottom:14px;">
                    ${escapeHtml(contractNumber)} — ${escapeHtml(title)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:6px;">
                    <span style="font-size:13px;color:#6b6b70;">Valor: </span>
                    <span style="font-size:14px;font-weight:600;color:#1a1a1a;">${escapeHtml(formatBRL(totalValue))}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size:13px;color:#6b6b70;">Início: </span>
                    <span style="font-size:14px;color:#1a1a1a;">${escapeHtml(formatDate(startDate))}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="${escapeHtml(signUrl)}"
                 style="display:inline-block;background-color:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Revisar e assinar contrato
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a8a8e;line-height:1.5;">
                Ou copie este link no navegador:<br/>
                <a href="${escapeHtml(signUrl)}" style="color:#3a3a3a;word-break:break-all;">${escapeHtml(signUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#f9f9fb;border-top:1px solid #ececef;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a8a8e;line-height:1.5;">
                Em caso de dúvidas, basta responder este email.<br/>
                Enviado por ${escapeHtml(providerName)} via ContratoFácil.
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

export const sendContractEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Busca contrato (RLS garante que é do user)
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select(
        "id, user_id, contract_number, title, total_value, start_date, public_token, client_id",
      )
      .eq("id", data.contractId)
      .maybeSingle();

    if (cErr) throw new Error(cErr.message);
    if (!contract) throw new Error("Contrato não encontrado");
    if (contract.user_id !== userId) throw new Error("Acesso negado");
    if (!contract.public_token)
      throw new Error("Contrato sem link público de assinatura");

    // Busca cliente e perfil em paralelo
    const [{ data: client, error: clErr }, { data: profile }] = await Promise.all([
      supabase
        .from("clients")
        .select("full_name, email")
        .eq("id", contract.client_id)
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
      throw new Error("Cliente sem email cadastrado. Cadastre um email para o cliente antes de enviar.");

    const providerName = profile?.full_name?.trim() || "Seu prestador";
    const signUrl = `${data.appOrigin.replace(/\/$/, "")}/c/${contract.public_token}`;

    const html = buildHtml({
      clientName: client.full_name,
      providerName,
      providerLogoUrl: profile?.logo_url ?? null,
      contractNumber: contract.contract_number,
      title: contract.title,
      totalValue: Number(contract.total_value),
      startDate: contract.start_date,
      signUrl,
    });

    const subject = `${providerName} enviou um contrato para sua assinatura`;

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

    // Registra em contract_history (não bloqueia em caso de erro)
    await supabase.from("contract_history").insert({
      contract_id: contract.id,
      user_id: userId,
      action: "email_sent",
      details: {
        recipient: client.email,
        message_id: respJson.id ?? null,
      },
    });

    return { ok: true, messageId: respJson.id ?? null, recipient: client.email };
  });
