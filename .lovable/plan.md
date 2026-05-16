## Adicionar explicativos completos sobre conectar Stripe (USD)

Adicionar guias claros em dois lugares: **Configurações** (explicação detalhada do por quê e como) e **Formulário de Fatura** (bloquear criação de fatura USD se Stripe não estiver conectado).

---

### 1. Configurações → Seção "Pagamentos internacionais (USD)"

Adicionar **antes** do botão "Conectar conta Stripe" (quando ainda não conectado) um card explicativo com:

- **Título:** "Por que preciso conectar uma conta Stripe?"
- **3 pontos com ícones:**
  1. 💵 **Receba pagamentos em dólar** — Seus clientes pagam com cartão internacional, sem complicação.
  2. 🏦 **Dinheiro vai direto para você** — O valor cai na sua conta Stripe (e depois na sua conta bancária). A plataforma não toca no seu dinheiro.
  3. ⚡ **Setup em 2 minutos** — Você cria/conecta sua conta Stripe e já pode emitir faturas em USD.

- **"O que vai acontecer:"** (passo a passo curto)
  1. Você clica em "Conectar conta Stripe"
  2. É redirecionado para a Stripe (cria conta nova ou conecta existente)
  3. Volta pro app já pronto pra receber

- **Nota:** "Você precisa de uma conta bancária ou número de roteamento (US/internacional) para receber os repasses da Stripe."

### 2. Formulário de Fatura (`InvoiceFormDialog.tsx`)

Quando `country === "US"` (fatura USD):
- Buscar `stripe_connect_account_id` + `stripe_connect_charges_enabled` do perfil (já carregamos perfil no `useEffect` — adicionar essas colunas).
- Se **não conectado** ou `charges_enabled = false`:
  - Substituir o `usdNotice` atual por um **aviso amarelo/destacado**:
    - "⚠️ Você ainda não configurou recebimento em dólar"
    - "Para emitir faturas em USD, primeiro conecte sua conta Stripe em Configurações → Pagamentos internacionais."
    - Botão **"Ir para Configurações"** (Link para `/configuracoes`).
  - **Desabilitar o botão "Gerar fatura"** enquanto Stripe não estiver conectado.
- Se conectado: manter o `usdNotice` atual (informativo).

### 3. Traduções (`pt-BR.json` + `en-US.json`)

Adicionar chaves novas:
- `settings.stripeConnect.whyTitle`, `whyPoint1/2/3`, `whatHappensTitle`, `step1/2/3`, `bankNote`
- `invoices.form.usdNotConfiguredTitle`, `usdNotConfiguredDesc`, `goToSettings`

---

### Arquivos a alterar

- `src/routes/configuracoes.tsx` — bloco explicativo na seção Connect (antes do botão).
- `src/components/invoices/InvoiceFormDialog.tsx` — buscar status Connect + bloquear submit USD sem Connect + novo aviso com link.
- `src/locales/pt-BR.json` e `src/locales/en-US.json` — novas chaves.

### Fora de escopo

- Não criar página dedicada de ajuda nem FAQ separado.
- Não mudar fluxo de PIX/BRL.
- Não alterar a server function `createInvoiceCheckout` (validação no backend já existe).
