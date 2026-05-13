## Problema

A página **Cobranças** falha com:
> Could not find a relationship between 'invoices' and 'clients' in the schema cache

A query em `src/routes/cobrancas.tsx` (linha 105-107) usa embed do PostgREST:
```ts
.from("invoices").select("..., client_id, clients(full_name)")
```

Isso exige uma **foreign key declarada** entre `invoices.client_id` e `clients.id`. Inspecionando o schema da tabela `public.invoices`, a coluna `client_id uuid NOT NULL` existe e tem índice, mas **não há FK constraint** apontando para `public.clients(id)`. Sem a FK, o PostgREST não consegue resolver o embed `clients(...)` e retorna esse erro — por isso nenhuma cobrança carrega na lista (e o teste com cliente cadastrado fica bloqueado antes mesmo de gerar/enviar PIX).

A tabela `contracts` provavelmente já tem essa FK configurada corretamente (por isso contratos com cliente funcionam), mas `invoices` foi criada sem ela.

## Correção

Migration única adicionando a foreign key faltante:

```sql
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;
```

Após a migration, o PostgREST recarrega o schema cache automaticamente e o embed `clients(full_name)` passa a funcionar — a lista de cobranças carrega e o fluxo de envio da cobrança de teste destrava.

Não há mudanças de código necessárias — apenas a migration de banco.

## Validação

1. Recarregar `/cobrancas` — a lista deve carregar sem o toast de erro.
2. Abrir uma cobrança existente / criar uma nova vinculada ao cliente cadastrado.
3. Enviar a cobrança (PIX) e confirmar que o fluxo segue normalmente.
