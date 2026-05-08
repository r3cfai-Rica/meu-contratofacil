## Objetivo

1. Permitir testar o checkout com cartão `4242 4242 4242 4242` sem cobrar dinheiro real, usando a chave **test** do Stripe no preview e a chave **live** no app publicado.
2. Desativar o **Stripe Link** no checkout, removendo o popup com telefone de outras contas.

---

## Parte 1 — Suportar chaves test + live por ambiente

### Como vai funcionar

- **`STRIPE_SECRET_KEY`** (já existe) → continua sendo a chave **live** (`sk_live_...`), usada pelo app publicado em `meu-contrato-na-mao.lovable.app`.
- **`STRIPE_SECRET_KEY_TEST`** (novo secret) → chave **test** (`sk_test_...`), usada no preview/desenvolvimento.
- **`STRIPE_WEBHOOK_SECRET`** (já existe) → webhook secret da chave **live**.
- **`STRIPE_WEBHOOK_SECRET_TEST`** (novo secret) → webhook secret de um endpoint test no Stripe.

O backend escolhe qual chave usar **com base no host da requisição**:
- Hosts `*.lovable.app` que NÃO sejam o domínio publicado (`meu-contrato-na-mao.lovable.app`) → usam **test**.
- Domínio publicado e domínios custom → usam **live**.
- Fallback: se a chave test não estiver configurada, cai para a live (não quebra nada).

### Mudanças de código

**`src/lib/billing.functions.ts`**
- Substituir `getStripe()` por uma versão que aceita o host atual e retorna a instância Stripe certa (test ou live).
- Adicionar helper `isTestEnvironment()` que lê `getRequestHost()` e decide.
- Todas as funções (`checkSubscription`, `createCheckoutSession`, `createPortalSession`, `cancelSubscriptionAtPeriodEnd`, `resumeSubscription`, `changePlan`, `getStripeStatus`, `listInvoices`) passam a usar a chave correta.
- `getStripeStatus` retorna também o modo (`test` ou `live`) para o admin ver.

**`src/routes/api/public/stripe/webhook.ts`**
- Tentar verificar a assinatura primeiro com `STRIPE_WEBHOOK_SECRET` (live); se falhar, tentar com `STRIPE_WEBHOOK_SECRET_TEST`.
- Usar a chave Stripe correspondente (live ou test) para chamadas subsequentes (`subscriptions.retrieve`, `customers.retrieve`).

**`src/routes/admin.tsx`** (se mostra status do Stripe)
- Exibir um badge "Modo: Teste" ou "Modo: Live" baseado no retorno de `getStripeStatus`.

### Configuração no Stripe (passos manuais que vou te guiar depois)

1. Pegar a `sk_test_...` em **Stripe → Developers → API keys** (toggle "Test mode" no canto).
2. Criar um segundo webhook endpoint em **Test mode** apontando para `https://id-preview--a1120060-9d17-4448-8ade-6bfc3d442970.lovable.app/api/public/stripe/webhook` com os mesmos 6 eventos.
3. Copiar o `whsec_...` desse webhook test.
4. Recriar os produtos Pro/Business em **Test mode** (test e live são catálogos separados) — vou criar via tool quando chegarmos lá.

### Secrets a adicionar
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_TEST`

---

## Parte 2 — Desativar Stripe Link no checkout

**`src/lib/billing.functions.ts` → `createCheckoutSession`**

Adicionar à criação da sessão:
```ts
payment_method_types: ["card"],
```

Isso restringe o checkout só a cartão, removendo o Link (que é tratado como método separado pelo Stripe). Nenhum cliente verá mais o popup "Confirm it's you" do Link.

Trade-off: clientes que usam Link em outros sites perdem o autopreenchimento. Mas o checkout fica mais limpo e sem confusão.

---

## Ordem de execução depois que aprovar

1. Eu implemento as mudanças de código (Parte 1 + Parte 2).
2. Te peço os secrets `STRIPE_SECRET_KEY_TEST` e `STRIPE_WEBHOOK_SECRET_TEST` via formulário seguro.
3. Te guio passo-a-passo no Stripe para:
   - Pegar a chave test
   - Criar o webhook test
   - Recriar os produtos Pro/Business em test mode (eu disparo via tool)
4. Atualizo `src/lib/plans.ts` com os IDs de price test (separados dos live por ambiente, ou usando lookup).
5. Você testa com `4242 4242 4242 4242` no preview.

### Detalhe sobre os price IDs

Test e live têm IDs diferentes. Duas opções:
- **A) Selecionar no código:** mapa `{ test: "price_xxx", live: "price_yyy" }` em `plans.ts`, escolhido pelo mesmo helper de ambiente. Mais explícito.
- **B) Lookup keys:** usar `lookup_key` no Stripe (ex: `pro_monthly`) que existe em ambos os modos com IDs diferentes; o código busca por lookup. Mais limpo, mais trabalho inicial.

**Recomendo A** por ser mais simples e direto.
