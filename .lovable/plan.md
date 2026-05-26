
## Objetivo

Validar a aceitação do app com uma oferta de lançamento por **tempo limitado**: pagamento **único de R$ 48,90** (em vez da assinatura cheia de R$ 68,90/mês), comunicando claramente que depois o modelo será por assinatura.

---

## 1. Novo bloco na landing page (`src/routes/index.tsx`)

Inserir uma **seção "Oferta de Lançamento"** entre a seção de benefícios e o CTA final, com:

- **Banner com selo de desconto** no topo da seção:
  - Tag: *"Oferta de lançamento — por tempo limitado"*
  - Selo destacado: *"~~R$ 68,90/mês~~ → R$ 48,90"* (preço riscado + novo preço)
  - Microtexto: *"Pagamento único. Depois, o acesso será apenas por assinatura mensal."*
- **Lista do que está incluso** (espelhando o plano Pro: clientes/contratos/cobranças ilimitados, lembretes, logo no contrato).
- **CTA principal** "Quero a oferta de lançamento" → leva para `/signup?offer=launch` (ou direto ao checkout se logado).
- **Aviso de pagamento**: ícones/badges de *"Cartão via Stripe · PIX"*.

Visual: card destacado com `border-primary`, gradiente sutil e o selo de desconto em badge `bg-primary text-primary-foreground` no canto.

## 2. Textos (i18n)

Adicionar chaves em `src/locales/pt-BR.json` e `en-US.json` em `landing.launchOffer.*`:
- `eyebrow`, `title`, `regularPriceLabel`, `regularPrice` ("R$ 68,90/mês"), `promoPrice` ("R$ 48,90"), `promoSuffix` ("pagamento único"), `description`, `features` (array), `cta`, `paymentMethods` ("Cartão (Stripe) · PIX"), `disclaimer` ("Depois desse período, o acesso será apenas via assinatura mensal.").

## 3. Checkout da oferta (Stripe — cartão + PIX)

Criar uma server function `createLaunchOfferCheckout` em `src/lib/billing.functions.ts` (ou novo `src/lib/launch-offer.functions.ts`):

- Usa `requireSupabaseAuth` (usuário precisa estar logado).
- Cria uma **Stripe Checkout Session** com:
  - `mode: "payment"` (pagamento único, não subscription)
  - `payment_method_types: ["card", "pix"]` (BRL)
  - `currency: "brl"`, `unit_amount: 4890`
  - `line_items` com `price_data` inline para "Aprova aí — Oferta de Lançamento" (mais simples que criar produto Stripe novo agora; ou criamos via tool `stripe--create_stripe_product_and_price` antes — recomendo criar produto/price dedicado para rastrear conversão).
  - `success_url`: `/configuracoes?launch=success`
  - `cancel_url`: `/?launch=canceled`
  - `metadata: { user_id, type: "launch_offer" }`
- Retorna `{ url }` e o frontend faz `window.location.href = url`.

## 4. Upgrade do usuário após pagar

Duas opções (escolherei a mais simples no build):

- **Opção A (mais simples)**: no webhook Stripe já existente (`src/routes/api/public/stripe/webhook.ts`), tratar evento `checkout.session.completed` quando `metadata.type === "launch_offer"` → atualizar o plano do usuário para `pro` na tabela de assinaturas/perfil, com flag `launch_offer = true` e sem `current_period_end` (ou setar 1 ano à frente).
- **Opção B**: nova coluna `launch_offer_active` no perfil; o `usePlan` considera `pro` se essa flag for `true`.

Vou inspecionar `src/lib/billing.functions.ts` e o schema na implementação para decidir; provavelmente Opção A reusa toda a lógica existente.

## 5. Fluxo do usuário não-logado

CTA "Quero a oferta" → se não logado: vai para `/signup?offer=launch`. Após o signup, redireciona automaticamente ao checkout da oferta (ler `?offer=launch` no signup e disparar `createLaunchOfferCheckout` ao final).

## 6. Detalhes técnicos

- Criar produto + price R$ 48,90 BRL no Stripe via `stripe--create_stripe_product_and_price` (one-time, currency `brl`).
- Guardar o `price_id` em `src/lib/plans.ts` como `LAUNCH_OFFER_PRICE_ID` (live + test).
- Stripe Checkout suporta nativamente **cartão + PIX** em BRL na mesma sessão — usuário escolhe na própria página.
- Sem contagem regressiva por enquanto (selo simples "tempo limitado"); fácil de adicionar depois se quiser deadline real.

## Arquivos afetados

```text
src/routes/index.tsx                  (nova seção)
src/locales/pt-BR.json, en-US.json    (textos)
src/lib/billing.functions.ts          (createLaunchOfferCheckout) OU novo arquivo
src/lib/plans.ts                      (LAUNCH_OFFER_PRICE_ID)
src/routes/api/public/stripe/webhook.ts (tratar launch_offer)
src/routes/signup.tsx                 (redirect pós-signup se ?offer=launch)
```

Sem migração de banco necessária se Opção A funcionar com a tabela atual de assinaturas — confirmo no build.
