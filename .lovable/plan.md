## Varredura — o que já está pronto vs. o que falta

### ✅ Já implementado
- Migration: `profiles.country`, `invoices.currency/stripe_checkout_session_id/stripe_payment_intent_id`, tabela `payment_logs` + RLS.
- `formatMoney(amount, currency)` em `src/lib/format.ts`.
- `createInvoiceCheckout` em `src/lib/invoice-payments.functions.ts` (cria sessão Stripe USD, grava `stripe_checkout_session_id`, loga em `payment_logs`).
- Seletor de país no `signup.tsx` e `configuracoes.tsx`.
- `InvoiceFormDialog` lê `profile.country` e força USD + esconde aviso de PIX para US.
- `pagar.$token.tsx` já carrega `currency` e usa `formatMoney`.

### ❌ Falta terminar

1. **Página pública `pagar.$token.tsx` — UI de cartão (USD)**
   - Hoje, se `currency === 'USD'` e não há PIX, cai no fallback amarelo "noPix". Precisa renderizar bloco "Pay with card" com botão que chama `createInvoiceCheckout({ data: { invoiceToken: token } })` e redireciona para `session.url`.
   - Ler `?status=success` / `?status=cancelled` da query e mostrar toast/estado correspondente; revalidar invoice ao voltar com `status=success` para refletir paga.
   - Condição de roteamento: `currency === 'USD'` → cartão; senão → PIX (atual).

2. **Webhook `src/routes/api/public/stripe/webhook.ts`**
   - Adicionar tratamento dentro do `case "checkout.session.completed"`: se `session.metadata.invoice_id` estiver presente (one-off de fatura, sem `subscription`), marcar `invoices.status='paid'`, `paid_at=now()`, salvar `stripe_payment_intent_id`, e inserir em `payment_logs` (`event_type: 'checkout.session.completed'`).
   - Adicionar `case "payment_intent.payment_failed"`: se `metadata.invoice_id` presente, inserir log em `payment_logs` (sem mudar status). Não confundir com o `invoice.payment_failed` do Stripe Billing já tratado.
   - Manter intacto o fluxo de assinaturas (subscription).

3. **`cobrancas.tsx` — moeda dinâmica**
   - Trocar `formatCurrencyBRL` por `formatMoney(value, currency)` nos cards de resumo e na coluna Valor. Selecionar `currency` no `.select(...)` e propagar pelo tipo `Invoice`.
   - Os cards de resumo agregam por moeda? Decisão simples: somar tudo na moeda do perfil (BR=BRL, US=USD) — ler `profile.country` uma vez e formatar com essa moeda.

4. **Traduções (pt-BR + en-US)**
   Adicionar chaves usadas e ainda inexistentes:
   - `auth.country`, `auth.countryHint`, `auth.countries.br`, `auth.countries.us`
   - `settings.country`, `settings.countryHint`
   - `invoices.form.usdNotice`
   - `publicInvoice.payWithCard`, `publicInvoice.payWithCardDesc`, `publicInvoice.payNow`, `publicInvoice.processing`, `publicInvoice.paymentSuccess`, `publicInvoice.paymentCancelled`

5. **Sanity check**
   - Rodar build após edits para garantir que não restou nenhum `formatCurrencyBRL` esquecido em campos com moeda dinâmica.
   - Confirmar que `attachSupabaseAuth` não é necessário aqui (a server fn é pública, sem `requireSupabaseAuth`) — ✅ ok.

### Ordem de execução
1. Webhook (backend primeiro, idempotente).
2. UI USD em `pagar.$token.tsx` + handler de query string.
3. `cobrancas.tsx` moeda dinâmica.
4. Chaves de tradução pt/en.
5. Build + smoke test.

Posso seguir?