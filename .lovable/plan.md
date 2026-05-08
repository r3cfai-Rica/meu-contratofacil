## Passo 1 — Webhook do Stripe

Criar endpoint público que recebe eventos do Stripe e sincroniza a tabela `subscriptions` automaticamente.

### Arquivo novo
`src/routes/api/public/stripe/webhook.ts` — server route TanStack que aceita `POST`.

### Fluxo do handler
1. Ler `request.text()` (raw body — necessário para validar assinatura)
2. Pegar header `stripe-signature`
3. Validar com `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` → 401 se inválido
4. Switch no `event.type`:
   - `checkout.session.completed` → buscar a subscription criada e fazer upsert
   - `customer.subscription.created` / `updated` → upsert plano, status, period_end, cancel_at_period_end, price_id
   - `customer.subscription.deleted` → marcar `canceled` + voltar plano `free`
   - `invoice.payment_succeeded` → atualizar `current_period_end`
   - `invoice.payment_failed` → marcar `past_due`
5. Retornar 200 sempre que o evento for processado (ou ignorado), para o Stripe não reenfileirar
6. Logar `event.id` e `event.type` no console

### Identificação do usuário
- Primário: buscar `user_id` pelo `stripe_customer_id` na tabela `subscriptions` (já preenchido pelo `checkSubscription`)
- Fallback: `supabaseAdmin.auth.admin.listUsers()` filtrado pelo email do customer no Stripe
- Mapeamento de plano: `planFromProductId()` em `src/lib/plans.ts`

### Banco de dados
- Sem migrations. Todas as colunas necessárias já existem em `subscriptions`
- Escrita via `supabaseAdmin` (bypass RLS), upsert por `user_id` (idempotente em reentregas)

### Secrets
- `STRIPE_SECRET_KEY` ✅ já configurada
- `STRIPE_WEBHOOK_SECRET` ✅ já configurada

### Validação após implementação
1. Chamar o endpoint com body inválido via `invoke-server-function` → deve retornar 401
2. Te passar a URL exata para colar no Stripe: `https://project--a1120060-9d17-4448-8ade-6bfc3d442970.lovable.app/api/public/stripe/webhook`
3. Você dispara um evento de teste pelo Stripe Dashboard → eu confirmo nos logs com `server-function-logs`

### Não muda
- `billing.functions.ts`, `plans.ts`, `admin.tsx`, schema do banco — webhook é puramente aditivo
