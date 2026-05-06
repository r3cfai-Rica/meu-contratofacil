1. Diagnóstico do problema de login
- Confirmar a causa atual: o e-mail `ricaferrari@mac.com` não existe no backend de autenticação neste momento.
- Validar também que não há registro correspondente em `user_roles`, por isso o fluxo atual nunca chega a conceder admin.
- Corrigir a estratégia atual: hoje o projeto apenas promove esse e-mail para admin depois do cadastro; ele não cria a conta automaticamente. Por isso tentar entrar direto com a senha falha com `invalid_credentials`.

2. Fazer a conta admin funcionar com o mesmo e-mail e senha informados
- Provisionar a conta administrativa real no backend com o e-mail e senha passados por você, para que o login funcione imediatamente.
- Garantir confirmação da conta e vínculo com o papel `admin` na tabela `user_roles`.
- Manter a automação existente para esse e-mail, mas complementar com o provisionamento inicial para não depender de um cadastro manual.
- Revisar o fluxo para que, ao entrar com essa conta, o menu Admin apareça e o acesso a `/admin` funcione sem erro.

3. Reforçar a segurança e o controle de acesso do Admin
- Proteger `/admin` no carregamento da rota, não apenas dentro do componente, evitando flashes de tela e acessos inconsistentes.
- Centralizar as consultas sensíveis do painel administrativo em funções de servidor, em vez de depender só de chamadas diretas do cliente.
- Manter o modelo de papéis separado em `user_roles`, com validação server-side.

4. Criar banco de dados de auditoria para compras e ações administrativas
- Adicionar uma estrutura de auditoria dedicada para registrar eventos importantes da plataforma.
- Registrar, no mínimo:
  - criação de conta
  - upgrade/downgrade/cancelamento de plano
  - criação e pagamento de cobranças
  - convites e aceite de membros de equipe
  - acessos e ações administrativas relevantes
- Modelar uma tabela de auditoria com dados como:
  - tipo do evento
  - usuário autor da ação
  - usuário afetado
  - e-mail
  - plano
  - referência externa de pagamento
  - metadados em JSON
  - data/hora
- Aplicar RLS restritiva para leitura apenas por administradores.

5. Melhorar o painel Admin para virar um dashboard completo
- Expandir o `/admin` para mostrar informações que um administrador realmente precisa acompanhar, incluindo:
  - total de usuários
  - assinantes por plano
  - MRR e receita acumulada
  - novos cadastros por período
  - usuários ativos e cancelados
  - compras recentes
  - pagamentos recentes
  - contas com cobrança vencida ou em risco
  - convites de equipe pendentes/aceitos
- Adicionar listas e filtros úteis:
  - busca por e-mail/nome/plano/status
  - filtro por período
  - filtro por plano
  - filtro por status de assinatura
- Exibir uma trilha de auditoria recente no próprio painel.

6. Integrar compras e assinatura à auditoria
- Revisar a integração de cobrança para registrar eventos de compra e mudança de assinatura de forma confiável.
- Se ainda não houver sincronização robusta de eventos de pagamento, adicionar um endpoint público de webhook para receber eventos do provedor de pagamento e gravar auditoria automaticamente.
- Garantir atualização consistente da tabela `subscriptions` e do histórico de auditoria.

7. Refinar a experiência administrativa
- Melhorar os cards, tabelas e seções do painel para leitura rápida.
- Incluir indicadores resumidos no topo e tabelas detalhadas abaixo.
- Exibir estados vazios, carregamento e erros com mensagens claras.

8. Verificação final
- Testar o login da conta admin provisionada.
- Validar visibilidade do item “Admin” no menu.
- Confirmar acesso ao `/admin`.
- Confirmar leitura dos dados agregados, usuários e trilha de auditoria.
- Entregar um resumo completo do que foi construído.

Detalhes técnicos
- Causa raiz confirmada: não existe usuário em `auth.users` com `ricaferrari@mac.com`, então a senha nunca poderia funcionar.
- Tabelas/funções já existentes e que serão aproveitadas: `user_roles`, `subscriptions`, `team_members`, `get_admin_stats`, `list_admin_users`, `has_role`, `is_admin`.
- Ajustes planejados no código:
  - reforçar `src/routes/admin.tsx`
  - revisar `src/hooks/use-is-admin.ts`
  - complementar o backend administrativo com funções de servidor
  - criar migration para auditoria e, se necessário, webhook de pagamentos
- Observação importante: vou fazer o acesso funcionar com o mesmo e-mail e senha que você passou, mas sem deixar credenciais expostas no código da interface.

Resultado esperado
- Você conseguirá entrar com o e-mail e senha informados.
- A conta abrirá o painel Admin corretamente.
- O painel terá visão completa de vendas, usuários, assinaturas e auditoria da plataforma.