## Diagnóstico (o que realmente está quebrado)

Confirmei no preview e no código três problemas independentes — por isso continuava "voltando":

1. **Email continua pedindo login do Lovable.**
   `src/lib/email.functions.ts` força a URL pública só quando o `appOrigin` é `id-preview--...lovable.app`, `*-dev.lovable.app` ou `lovable.dev`. Mas o preview real hoje roda em `a1120060-….lovableproject.com` (vi na barra do navegador e na captura que você enviou). Esse host **não cai em nenhuma das regras**, então o servidor aceita o `appOrigin` do preview e o link enviado por email aponta para o domínio do projeto no Lovable, que exige login.

2. **Idioma misturado na página pública do contrato (`/c/$token`).**
   O componente já troca o `i18n` quando recebe `?lang=…`, mas:
   - **Moeda** é renderizada com `formatCurrencyBRL` (sempre R$, mesmo em EN).
   - **Datas** usam `formatDateBR` (sempre `pt-BR`).
   - **PDF do contrato** (`src/lib/contractPdf.ts`) tem todos os rótulos fixos em PT ("PRESTADOR", "CLIENTE", "Valor total", "CONTRATOFÁCIL", etc.) e moeda em BRL.

3. **Página pública de pagamento (`/pagar/$token`) ignora idioma.**
   A rota nem aceita `?lang=…`, e o link de PIX/cartão herdado de uma cobrança nunca propaga o idioma. Resultado: cliente que abriu o contrato em inglês vai parar numa tela em português.

Bônus (mesma causa do problema 1): o link "Copiar" no diálogo de contrato monta `${window.location.origin}/c/…`, então também copia uma URL de preview em vez da pública.

## Decisão de produto que você confirmou
- **Método de pagamento segue o país da conta**, não o idioma. Hoje isso já está certo no código (cobrança em USD ⇒ Stripe, BRL ⇒ PIX). **Não vou mexer** nessa regra.

## Mudanças (cirúrgicas, sem regressão)

### 1. `src/lib/email.functions.ts` — forçar URL pública sempre
- Remover o `appOrigin` da assinatura de entrada (ou ignorá-lo internamente) e **sempre** montar `signUrl` a partir de `PUBLIC_APP_URL` (`https://meu-contrato-na-mao.lovable.app`) com `?lang=<idioma>`.
- Justificativa: o email é assíncrono e o destinatário nunca está logado no Lovable; não existe caso legítimo em que o link de email deva apontar para preview.

### 2. `src/components/contracts/ContractDetailDialog.tsx` — copiar a URL pública correta
- Trocar `publicUrl` para usar a constante `PUBLIC_APP_URL` (exportada do mesmo módulo, em `src/lib/publicUrls.ts` novo) + `?lang=<currentLang>`.
- Assim o botão "Copiar" também devolve um link que abre sem login.

### 3. `src/routes/c.$token.tsx` — formatação dependente de idioma
- Substituir `formatCurrencyBRL` por uma função `formatMoneyByLang(value, lang)` (USD em EN, BRL em PT) usando `i18n.language`.
- Substituir `formatDateBR` por `formatDateByLang(date, lang)` com `toLocaleDateString` no locale ativo.
- Adicionar essas helpers em `src/lib/format.ts` (sem mexer nas existentes — outras telas continuam intactas).
- Ao clicar **"Baixar PDF"** na página pública assinada, passar `lang` para o gerador de PDF.

### 4. `src/lib/contractPdf.ts` — PDF bilíngue
- Aceitar `language: "pt-BR" | "en-US"` opcional (default `pt-BR`).
- Trocar strings fixas ("PRESTADOR", "CLIENTE", "Valor total", "Início", "Término", "DESCRIÇÃO DO SERVIÇO", "CLÁUSULAS", "ASSINATURA DIGITAL", "Indeterminado", "Página X de Y", "Nome", "CPF", "Assinado em", "IP", "CONTRATOFÁCIL") por um dicionário `STRINGS[language]`.
- Moeda via `Intl.NumberFormat(lang, { currency })` (USD em EN, BRL em PT).
- Datas via `toLocaleDateString(lang)`.
- Callers atualizados: `ContractDetailDialog.downloadPdf` (idioma do app), `c.$token.tsx.downloadPdf` (idioma da URL/`i18n`).

### 5. `/pagar/$token` — propagar idioma
- Aceitar `?lang=pt-BR|en-US` em `validateSearch`.
- `useEffect` chama `i18n.changeLanguage(lang)` quando presente (mesmo padrão de `c.$token.tsx`).
- A própria página já usa `t(...)` em tudo e `formatMoney(amount, currency)` que respeita USD/BRL — então só falta forçar o idioma certo na primeira renderização para o cliente.
- O `head().meta.title` continua estático (não é visível para o cliente final, só na aba).

### 6. Propagar `?lang` para a página de pagamento
- Quando o **contrato** assinado aponta para a fatura, o cliente costuma navegar a partir do email do contrato. Atualizar:
  - `ContractDetailDialog`/`ContractFormDialog`: o link copiado e o email já levam `?lang`, sem mudança aqui após o item 2.
  - Em `cobrancas.tsx` (`copyLink`): incluir `?lang=<idioma do app>` ao copiar o link de cobrança, para que quem envia em EN gere link em EN.
- Não cria página nova nem rota nova.

## Detalhes técnicos

- **Não tocar** `src/integrations/supabase/*`, `routeTree.gen.ts`, lógica de plano/admin, autenticação, RLS ou Stripe Connect. Nada disso está relacionado.
- **Não mudar** moeda/método de pagamento por idioma (decisão confirmada: segue país da conta).
- Novo arquivo `src/lib/publicUrls.ts` (uma constante `PUBLIC_APP_URL` + helper `buildContractSignUrl(token, lang)` / `buildInvoicePayUrl(token, lang)`) para ter **uma única fonte da verdade** e nunca mais alguém usar `window.location.origin` para link público.
- Helpers novos em `src/lib/format.ts`: `formatMoneyByLang`, `formatDateByLang`. Funções antigas permanecem (usadas no painel administrativo interno).
- `contractPdf.ts` ganha um parâmetro opcional `language`; default mantém comportamento atual para qualquer chamada existente que eu não atualize.

## Verificação após o build
1. No preview, abrir um contrato existente em PT, clicar "Reenviar email" → checar nos logs/banco que o link gravado em `contract_history.details` aponta para `https://meu-contrato-na-mao.lovable.app/c/<token>?lang=pt-BR`.
2. Trocar idioma para EN, reenviar → link deve sair `?lang=en-US`; ao abrir, página pública aparece 100% em inglês, valor em US$, data em formato US.
3. Baixar PDF em EN → rótulos em inglês, moeda US$, data US.
4. Abrir uma cobrança em EN e copiar o link → URL termina em `?lang=en-US` e a página `/pagar/...` renderiza em inglês.
5. Repetir em PT para garantir que nada regrediu (R$, dd/mm/aaaa, textos PT, PIX visível).

Sem mudanças em banco, RLS, autenticação, planos ou Stripe.
