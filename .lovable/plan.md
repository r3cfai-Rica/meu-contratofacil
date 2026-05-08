## Passo 1 — Webhook do Stripe

Criar endpoint público que recebe eventos do Stripe e sincroniza a tabela `subscriptions` automaticamente, sem depender do usuário logar.

### O que será feito

**1. Secret novo**
- Adicionar `STRIPE_WEBHOOK_SECRET` (o "Signing secret" gerado pelo Stripe ao criar o endpoint). Solicitado via `add_secret`.

**2. Nova rota pública**
- Arquivo: `src/routes/api/public/stripe/webhook.ts`
- Endpoint: `POST /api/public/stripe/webhook`
- Verifica a assinatura do header `stripe-signature` usando `stripe.webhooks.constructEvent` (com o raw body, sem parse antes)
- Retorna 401 se assinatura inválida
- Usa `supabaseAdmin` (service role) para escrever em `subscriptions`

**3. Eventos tratados**
| Evento | Ação |
|---|---|
| `checkout.session.completed` | Buscar a subscription criada e fazer upsert em `subscriptions` (ativa o plano imediatamente após pagamento) |
| `customer.subscription.created` / `updated` | Upsert plano, status, `current_period_end`, `cancel_at_period_end`, price_id, subscription_id |
| `customer.subscription.deleted` | Marcar `status='canceled'` e voltar `plan='free'` |
| `invoice.payment_succeeded` | Atualizar `current_period_end` (renovação) |
| `invoice.payment_failed` | Marcar `status='past_due'` |

Mapeamento de plano usa `planFromProductId()` já existente em `src/lib/plans.ts`.

**4. Identificação do usuário**
- Buscar `user_id` via `stripe_customer_id` na tabela `subscriptions` (já populado por `checkSubscription`)
- Fallback: buscar pelo email do customer no Stripe → `auth.users` (via `supabaseAdmin.auth.admin.listUsers` filtrado)

**5. Idempotência e logs**
- Logar `event.id` e `event.type` no console (visível em `server-function-logs`)
- Operações são `upsert` por `user_id`, então reentregas não causam duplicação

**6. Configuração no Stripe (instruções para o usuário, não código)**
Após o deploy, vou te passar a URL exata para colar em **Stripe Dashboard → Developers → Webhooks → Add endpoint**, marcar os 5 eventos acima, copiar o "Signing secret" e colar no secret `STRIPE_WEBHOOK_SECRET`.

### Detalhes técnicos

- A rota fica em `/api/public/*` para bypassar auth no site publicado (Stripe não envia bearer token)
- Body precisa ser lido como `request.text()` antes da verificação de assinatura — `JSON.parse` só depois de validar
- URL do webhook: `https://project--a1120060-9d17-4448-8ade-6bfc3d442970.lovable.app/api/public/stripe/webhook` (preview) ou domínio publicado
- Sem mudanças no schema do banco — colunas necessárias já existem em `subscriptions`
- Sem mudanças nos arquivos atuais (`billing.functions.ts`, `plans.ts`, `admin.tsx`) — webhook é aditivo

### Arquivos

- **Novo:** `src/routes/api/public/stripe/webhook.ts`
- **Secret novo:** `STRIPE_WEBHOOK_SECRET`

Após implementar, testo invocando o endpoint com payload inválido (deve retornar 401) e te passo a URL + lista de eventos para colar no Stripe.
