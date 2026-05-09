## Retomar de onde paramos

O código já está pronto. Faltam só os passos operacionais com você + Stripe.

### Passo 1 — Pegar a chave de teste do Stripe
1. No Stripe, ative o toggle **"Test mode"** no canto superior direito.
2. Vá em **Developers → API keys**.
3. Copie a **Secret key** que começa com `sk_test_...`.

### Passo 2 — Criar o webhook em modo Test
1. Ainda em Test mode, vá em **Developers → Webhooks**.
2. Clique em **Add endpoint**.
3. URL: `https://meu-contrato-na-mao.lovable.app/api/public/stripe/webhook`
4. Selecione os mesmos 6 eventos do webhook live:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Após criar, copie o **Signing secret** (`whsec_...`).

### Passo 3 — Cadastrar os 2 secrets no Lovable Cloud
Eu abro o formulário seguro pedindo:
- `STRIPE_SECRET_KEY_TEST` → cole o `sk_test_...`
- `STRIPE_WEBHOOK_SECRET_TEST` → cole o `whsec_...`

### Passo 4 — Criar produtos Pro e Business em modo Test
Eu disparo via tool `stripe--create_stripe_product_and_price`:
- **Pro** — R$ 49,00/mês recorrente
- **Business** — R$ 99,00/mês recorrente

Catálogos test e live são separados no Stripe, por isso precisamos recriar.

### Passo 5 — Atualizar `src/lib/plans.ts`
Adiciono os campos `stripePriceIdTest` e `stripeProductIdTest` para Pro e Business com os IDs criados no passo 4. O helper `getPlanPriceId(tier, mode)` já está pronto para escolher o ID correto automaticamente.

### Passo 6 — Testar
Você abre o preview, vai em **Planos → Assinar Pro**, e usa:
- Cartão: `4242 4242 4242 4242`
- Validade: qualquer data futura (ex: `12/34`)
- CVC: qualquer (ex: `123`)
- CEP: qualquer

Se funcionar, sua assinatura aparecerá como **Pro** em **Configurações** (em modo test, sem cobrar dinheiro real). Eu confiro os logs do webhook para validar.

---

**Próximo passo agora:** começar pelo **Passo 1** no Stripe. Me avise quando tiver as chaves em mãos que eu abro o formulário de secrets.
