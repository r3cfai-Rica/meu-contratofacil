# Plano: Stripe Connect para faturas USD

## Objetivo

Separar os dois fluxos de pagamento:

1. **Assinaturas do SaaS** (Free/Pro/Business) → continuam na **sua conta Stripe da plataforma** (já funciona).
2. **Faturas USD que os usuários emitem para os clientes deles** → passam a cair na **conta Stripe do próprio usuário**, via Stripe Connect (Standard accounts).

PIX/BRL não muda — continua direto na chave PIX do usuário.

## Como vai funcionar (visão do usuário)

1. Usuário vai em **Configurações → Pagamentos internacionais**.
2. Clica em **"Conectar conta Stripe"** → é redirecionado para o onboarding da Stripe (cria conta nova ou conecta existente em ~2 min).
3. Volta pro app com a conta conectada. Status mostrado: "Conectado · pode receber pagamentos".
4. A partir daí, faturas em USD geram um Checkout que deposita direto na conta dele.
5. Você (admin) pode opcionalmente cobrar uma `application_fee` (% por transação) — começamos com **0%**, configurável depois.

## Mudanças técnicas

### 1. Banco de dados (migration)

Adicionar à tabela `profiles`:
- `stripe_connect_account_id text` — ID da conta conectada (`acct_...`)
- `stripe_connect_charges_enabled boolean default false` — pode aceitar pagamento
- `stripe_connect_payouts_enabled boolean default false` — pode receber repasse
- `stripe_connect_onboarded_at timestamptz` — quando completou onboarding

### 2. Server functions novas (`src/lib/stripe-connect.functions.ts`)

- `createConnectAccountLink` — cria/recupera `acct_...` Standard, gera Account Link de onboarding, retorna URL.
- `getConnectAccountStatus` — consulta status atual (charges_enabled, payouts_enabled, requirements pendentes) e atualiza `profiles`.
- `createConnectLoginLink` — gera link para o usuário acessar o dashboard Stripe dele (ver pagamentos, configurar conta bancária etc.).

### 3. Atualizar `createInvoiceCheckout` (`src/lib/invoice-payments.functions.ts`)

- Antes de criar o Checkout, ler `profile.stripe_connect_account_id` do dono da fatura.
- Se vazio ou `charges_enabled=false` → erro amigável: "O profissional ainda não configurou recebimento internacional".
- Criar a Checkout Session com `stripeAccount: connectAccountId` no header (Direct Charges) — assim o pagamento entra direto na conta do usuário.
- `application_fee_amount: 0` por enquanto (ou configurável).

### 4. Webhook (`src/routes/api/public/stripe/webhook.ts`)

- Aceitar webhooks **conectados** (Stripe envia com header `Stripe-Account`).
- Para `checkout.session.completed` de fatura: a busca por `invoice_id` em metadata continua funcionando, mas o `payment_intent` precisa ser recuperado com `{ stripeAccount }`.
- Adicionar handler `account.updated` → atualiza flags `charges_enabled`/`payouts_enabled` em `profiles`.
- Endpoint **adicional** para webhooks de Connect (mesma URL ou `/api/public/stripe/connect-webhook` — vou usar a mesma e diferenciar pelo header `Stripe-Account`).

### 5. UI

- **`configuracoes.tsx`** — nova seção "Recebimento internacional (USD)" com:
  - Botão "Conectar conta Stripe" (quando não conectado).
  - Status da conta + botão "Acessar painel Stripe" (quando conectado).
  - Aviso se `requirements` pendentes.
- **`pagar.$token.tsx`** — se a fatura é USD mas o dono ainda não conectou Stripe, mostrar mensagem clara em vez de tentar checkout.
- **`InvoiceFormDialog.tsx`** — ao criar fatura USD, avisar se Connect ainda não foi configurado.

### 6. Rota de retorno do onboarding

- `src/routes/configuracoes.tsx` lê `?stripe_connect=success|refresh` e dispara `getConnectAccountStatus` pra sincronizar.

## Configuração necessária na Stripe (uma vez)

Você (dono da plataforma) precisa **ativar Connect** no dashboard Stripe:
1. https://dashboard.stripe.com/settings/connect → ativar.
2. Configurar branding (nome, logo, cor) — aparece no onboarding dos seus usuários.
3. Adicionar o endpoint do webhook como **"Connect"** (não só "Account") para receber `account.updated` e eventos das contas conectadas.

Não precisa de novas chaves — usa o mesmo `STRIPE_SECRET_KEY` / `STRIPE_SECRET_KEY_TEST`.

## Ordem de execução

1. Migration (4 colunas em `profiles`).
2. Server functions de Connect.
3. UI em `configuracoes.tsx` (conectar + status).
4. Atualizar `createInvoiceCheckout` para usar `stripeAccount`.
5. Atualizar webhook para `account.updated` + Direct Charges.
6. Mensagens em `pagar.$token.tsx` e `InvoiceFormDialog.tsx`.
7. Você ativa Connect no dashboard Stripe e adiciona o webhook Connect.
8. Teste end-to-end em modo test.

## Fora de escopo (fica pra depois)

- Cobrança de `application_fee` (taxa da plataforma) — deixar 0 agora, fácil de ligar depois.
- Express/Custom accounts (vamos com Standard, mais simples).
- Multi-moeda além de USD/BRL.