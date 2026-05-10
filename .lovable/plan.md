## Diagnóstico (causa raiz)

Analisei o fluxo de "Enviar para assinatura" em `ContractFormDialog.tsx` e `ContractDetailDialog.tsx`. **Não existe nenhum bug — existe uma funcionalidade ausente**:

- O botão "Enviar para assinatura" apenas:
  1. Gera um `public_token` (UUID)
  2. Muda o status para `awaiting_signature`
  3. Mostra um toast "Contrato enviado para assinatura!"
- **Nenhum email é enviado em nenhum momento.** Não há Edge Function, nem integração com Resend/SMTP/Lovable Emails, nem chamada de envio. O cliente nunca recebeu porque o sistema nunca mandou.
- O fluxo atual presume que você copie o link manualmente (botão "Copiar link") e envie por WhatsApp/email por fora.

Além disso, ainda não há domínio de email configurado no projeto, então não há infraestrutura de envio.

## Plano para corrigir

### 1. Configurar domínio de envio de emails
Pré-requisito obrigatório. Vou abrir o diálogo de setup do domínio de email (você escolhe o domínio, ex.: `notify.meucontratonamao.com.br`, ou usa um subdomínio do app). DNS pode levar até 72h, mas o resto da infra já fica pronto e dispara assim que o domínio verificar.

### 2. Provisionar a infraestrutura de emails
Criar tabelas de fila, log de envios, supressão, cron de processamento e a rota de envio transacional.

### 3. Criar template de email "Contrato para assinatura"
Email em React Email com:
- Saudação personalizada (nome do cliente)
- Nome do prestador / logo (se houver)
- Número, título e resumo do contrato (valor, datas)
- Botão grande "Revisar e assinar contrato" → link público `/c/{token}`
- Visual alinhado ao branding do app

### 4. Disparar email automaticamente ao "Enviar para assinatura"
Atualizar dois pontos:
- `ContractFormDialog.tsx` (criar contrato e enviar)
- `ContractDetailDialog.tsx` (gerar link de assinatura)

Em ambos, após gravar o `public_token`, chamar o envio transacional usando o email do cliente cadastrado (`clients.email`). Validar antes que o cliente tem email — se não tiver, avisar para cadastrar.

Adicionar também um botão "Reenviar email" no diálogo de detalhes do contrato.

### 5. Registrar envios em histórico
Inserir entrada em `contract_history` com action `email_sent` para auditoria.

### 6. Teste com contrato existente
Após o domínio verificar, vou disparar o envio de um contrato já criado (ex.: o último `awaiting_signature`) para o seu email cadastrado para confirmar entrega ponta-a-ponta.

## Observações

- Enquanto o DNS do domínio não verificar, os emails ficam enfileirados e disparam automaticamente assim que verificar — nada se perde.
- O envio passa pela fila com retry automático, supressão de bounces e link de descadastro (footer obrigatório, anexado pelo sistema).
- Não vou usar serviços externos (Resend/SendGrid) — Lovable Cloud já fornece envio nativo sem API key.

## Pergunta antes de começar

Qual domínio você quer usar como remetente?
- Algo do tipo `contratos@notify.meucontratonamao.com.br` (precisa que você adicione registros NS no seu provedor de domínio)
- Ou prefere que eu te oriente passo-a-passo no diálogo de configuração

Confirma que posso seguir? Assim que aprovar, eu abro o diálogo de domínio e implemento tudo na sequência.