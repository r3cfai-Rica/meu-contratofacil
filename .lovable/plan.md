# Preencher cobrança automaticamente ao escolher contrato

Hoje, no diálogo "Nova cobrança" (`src/components/invoices/InvoiceFormDialog.tsx`), ao escolher Cliente e Contrato, os campos Descrição, Valor e Vencimento ficam em branco. Vamos preencher esses campos automaticamente com os dados do contrato selecionado (apenas quando o contrato estiver assinado).

## Comportamento

Quando o usuário seleciona um contrato no campo "Contrato":

- **Descrição** → preenchida com `título do contrato` (ex.: "CT-000007 — Site") se ainda estiver vazia.
- **Valor** → preenchido com `total_value` do contrato.
- **Vencimento** → preenchido com `start_date` do contrato (data de início). Se o contrato tiver `end_date`, podemos usar a data final como vencimento — confirmo a regra abaixo.
- **Cliente** → se o usuário escolher primeiro o contrato, setamos o cliente automaticamente.
- Se o contrato selecionado for `none`, nada é alterado (mantém o que o usuário digitou).
- Se o usuário já digitou um valor manualmente, **não sobrescrevemos** — só preenchemos campos vazios, para não apagar edições.
- Funciona tanto para contas BR (PIX/BRL) quanto US (Stripe/USD); a moeda já segue o país da conta.

## Pontos técnicos

1. Expandir a query de contratos em `InvoiceFormDialog.tsx` para trazer também: `total_value`, `start_date`, `end_date`, `status`, `title`.
2. Filtrar a lista de contratos no select para mostrar apenas contratos `signed` (ou `signed` + `sent`/`awaiting_signature` — confirmo abaixo), já que faz sentido cobrar só de contrato vigente.
3. Adicionar um `useEffect` que dispara quando `contractId` muda: busca o contrato na lista local e preenche `description`, `amount` e `dueDate` se estiverem vazios; e seta `clientId` se não houver cliente escolhido.
4. Não mexer em backend, RLS ou Stripe — é só UI/estado do diálogo.

## Arquivo a editar

- `src/components/invoices/InvoiceFormDialog.tsx`

## Perguntas rápidas (posso assumir defaults se preferir)

1. **Quais contratos aparecem no select?** Default sugerido: apenas `signed`. Hoje mostra todos.
2. **Vencimento** → usar `start_date` do contrato como default? Ou preferir hoje + 7 dias?
3. **Sobrescrever campos já preenchidos?** Default: não sobrescreve. Trocar de contrato só altera campos vazios.

Se você não responder, sigo com os defaults: somente contratos assinados, vencimento = `start_date`, não sobrescreve campos digitados.
