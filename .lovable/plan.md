## Pagamentos internacionais (USA) — Plano

Hoje o app cobra clientes brasileiros via PIX (`pagar.$token`). Para usuários dos EUA, precisamos cobrar em USD via Stripe Checkout (cartão), mantendo o PIX intacto para o BR.

### 1. Banco de dados
- Adicionar `country` (`text`, default `'BR'`, check `IN ('BR','US')`) em `profiles`.
- Atualizar trigger `handle_new_user` para gravar `country` a partir de `raw_user_meta_data.country`.
- Adicionar em `invoices`:
  - `currency text not null default 'BRL'` (`BRL` | `USD`)
  - `stripe_checkout_session_id text`
  - `stripe_payment_intent_id text`
- Criar tabela `payment_logs` (id, invoice_id, user_id, provider `'stripe'|'pix'`, event_type, amount_cents, currency, raw jsonb, created_at) com RLS: dono vê os seus; admin vê tudo; webhook insere via service role.

### 2. Signup / Perfil
- `signup.tsx`: adicionar seletor **País** (Brasil / United States), salvar em `options.data.country`.
- `configuracoes.tsx`: permitir trocar país (afeta moeda padrão das próximas faturas).
- Idioma já é controlado pelo `LanguageSwitcher` — país é independente (define método de pagamento).

### 3. Faturas
- `InvoiceFormDialog`: se `profile.country === 'US'` → moeda travada em USD, esconder PIX; se BR → BRL + PIX (comportamento atual).
- Mostrar moeda correta em `cobrancas.tsx`, `pagar.$token.tsx`, badges e totais (helper `formatMoney(amount, currency)`).

### 4. Server functions (TanStack `createServerFn`)
Novo arquivo `src/lib/invoice-payments.functions.ts`:
- `createInvoiceCheckout({ invoiceToken })` — público (sem auth), busca a invoice via `supabaseAdmin` pelo `public_token`, cria `Stripe Checkout Session` em `mode: 'payment'`, USD, `success_url` → `/pagar/$token?status=success`, `cancel_url` → mesma página. Persiste `stripe_checkout_session_id` na invoice.
- Reaproveita `getStripeForMode` / `getCurrentStripeMode` já existentes.

### 5. Página pública de pagamento
`pagar.$token.tsx`:
- Se `invoice.currency === 'USD'` → renderizar UI "Pay with card" + botão que chama `createInvoiceCheckout` e redireciona pra `session.url`. Mostrar status "success" lendo `?status=success`.
- Se `BRL` → fluxo PIX atual (sem mudanças).

### 6. Webhook
Estender `src/routes/api/public/stripe/webhook.ts`:
- Tratar `checkout.session.completed` quando `metadata.invoice_id` estiver presente:
  - marcar invoice `status='paid'`, `paid_at=now()`, salvar `stripe_payment_intent_id`.
  - inserir em `payment_logs`.
- Tratar `payment_intent.payment_failed` → log em `payment_logs` (sem mudar status).

### 7. Traduções
Adicionar chaves em `pt-BR.json` / `en-US.json`: `publicInvoice.payWithCard`, `publicInvoice.processing`, `publicInvoice.paidSuccess`, `auth.country`, `auth.countries.br`, `auth.countries.us`, `settings.country`, etc.

### 8. Detalhes técnicos
- Manter PIX 100% funcional para BR — nenhuma regressão.
- Stripe key já configurada (`STRIPE_SECRET_KEY` / `_TEST`); reutilizar `getCurrentStripe()`.
- Webhook já existe e está verificando assinatura — só adicionamos novos `case`.
- `payment_logs` é insert-only via service role (webhook); usuários só leem os seus.

### Ordem de execução
1. Migration (profiles.country, invoices.currency + stripe ids, payment_logs).
2. Signup + perfil (país).
3. `invoice-payments.functions.ts` + webhook.
4. UI de fatura (form + pública) com moeda dinâmica.
5. Traduções finais e teste end-to-end em modo test.

Posso seguir?
