## Objetivo

Traduzir o nome da marca "ContratoFácil" para "EasyContract" (ou similar) quando o usuário selecionar inglês.

## Decisão necessária

Qual nome usar em inglês? Sugestões:

- **EasyContract** (tradução direta, mantém o conceito)
- **ContractEase**
- **Manter "ContratoFácil"** (marca permanece igual em qualquer idioma — padrão para muitas marcas globais)

## Mudanças

### 1. Adicionar chaves de tradução

Em `src/locales/pt-BR.json` e `src/locales/en-US.json`, adicionar dentro de `common`:

- `brandPrefix`: "Contrato" / "Easy"
- `brandSuffix`: "Fácil" / "Contract"

(divisão em duas partes para preservar o estilo visual atual onde o sufixo aparece em destaque na cor primária)

### 2. Atualizar componentes que mostram o nome

- `src/components/Navbar.tsx` (linha do logo) — usar `t("common.brandPrefix")` + `t("common.brandSuffix")`
- `src/routes/index.tsx` — footer com "© ... ContratoFácil" → usar as mesmas chaves
- Verificar `src/routes/login.tsx`, `src/routes/signup.tsx` e `AppSidebar.tsx` se exibem o nome — atualizar todos

### 3. Não alterar

- Meta tags / `<title>` no `__root.tsx` (SEO usa nome fixo "Aprova ai")
- Nome técnico em e-mails transacionais e identidade externa (manter consistente até decisão de branding)

## Pergunta

Qual nome você quer em inglês?