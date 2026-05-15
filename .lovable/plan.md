
Vou implementar nas duas frentes que você pediu, mas antes de começar preciso alinhar alguns pontos importantes — esse escopo é grande e tem decisões que mudam bastante o resultado.

## Parte 1 — i18n (PT-BR / EN-US)

**O que farei:**
1. Instalar `react-i18next` + `i18next` + `i18next-browser-languagedetector`.
2. Criar `src/lib/i18n.ts` com config (detecta navegador → fallback PT, persiste em `localStorage`).
3. Criar `src/locales/pt-BR.json` e `src/locales/en-US.json` com chaves organizadas por namespace (`common`, `landing`, `auth`, `dashboard`, `contracts`, `invoices`, `clients`, `billing`, `errors`).
4. Adicionar `<LanguageSwitcher />` (🇧🇷 PT / 🇺🇸 EN) na `Navbar` pública e no header do `AppLayout`.
5. Substituir strings hard-coded por `t('chave')` em: landing (`routes/index.tsx`), `login`, `signup`, `dashboard`, `clientes`, `contratos`, `cobrancas`, `configuracoes`, `planos`, `equipe`, `admin`, e dialogs principais. Toasts incluídos.
6. PDFs/contratos gerados: usar idioma do usuário logado (campo `preferred_language` do profile) no `contractTemplate.ts` e `contractPdf.ts`.

**Fora deste turno:** e-mails transacionais — já enviamos por Resend; vou deixar o template em PT por enquanto e abrir TODO, salvo se você quiser que eu já duplique os templates.

## Parte 2 — Pagamentos USA

Aqui preciso parar e perguntar antes de codar. Hoje o app **não tem Stripe Checkout/PaymentIntents implementados para cobranças de clientes finais** — o Stripe atual é só para a assinatura SaaS do dono da conta (planos Pro/Business). As cobranças aos clientes do usuário hoje são **PIX manual** (QR Code estático gerado localmente, sem confirmação automática).

Isso muda muito o escopo do "ACH para USA":

- ACH Direct Debit exige **Stripe Connect** (cada usuário do ContratoFácil precisa ter uma conta Stripe conectada para receber em nome dele) **OU** funcionar como marketplace (você recebe e repassa). Hoje não temos nem um nem outro.
- PayPal idem: precisa de credenciais por-usuário (Partner Referrals) ou centralizado na sua conta.
- Sem isso, o dinheiro do cliente americano cairia na **sua** conta Stripe/PayPal, não na do usuário do app.

**Preciso da sua decisão antes de continuar:**

1. **Modelo financeiro USA:** Stripe Connect (cada cliente do app conecta a própria conta — recomendado para SaaS de cobrança) ou tudo cai na sua conta central e você repassa manualmente?
2. **Escopo mínimo agora:** quer que eu já implemente Connect + ACH + PayPal completo (trabalho grande, várias rodadas), ou faço só:
   - i18n completo ✅
   - Campo `country` + `preferred_language` no profile + select no cadastro ✅
   - Tabela `payment_methods_log` ✅
   - UI de checkout que **mostra** as opções ACH/PayPal por país (mock/placeholder) e deixa a integração real para um próximo turno?
3. **PayPal:** tem conta PayPal Business já? Preciso do `VITE_PAYPAL_CLIENT_ID` (sandbox por enquanto serve).

## Banco de dados (vou aplicar assim que confirmar)

```sql
ALTER TABLE profiles
  ADD COLUMN country varchar(2) NOT NULL DEFAULT 'BR',
  ADD COLUMN preferred_language varchar(5) NOT NULL DEFAULT 'pt-BR';

CREATE TABLE payment_methods_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_id uuid,
  payment_method text NOT NULL CHECK (payment_method IN ('stripe_card','pix','ach','paypal')),
  amount numeric NOT NULL,
  currency text NOT NULL CHECK (currency IN ('BRL','USD')),
  status text NOT NULL,
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- + RLS: dono vê os próprios; admin vê tudo.
```

---

**Me responde:**
- (A) Modelo financeiro USA: **Connect** ou **conta central**?
- (B) Quer o escopo **mínimo agora** (i18n + estrutura de país + UI placeholder dos métodos USA + tabela de log) e integração real ACH/PayPal num próximo turno? Ou vai fundo já?
- (C) Tem `PAYPAL_CLIENT_ID` (sandbox) para eu pedir como secret?

Com essas três respostas eu sigo direto para a implementação.
