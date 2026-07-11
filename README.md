# Chi Sublime

Plataforma de gestão para salão de cabeleireiro e estética. Reúne, numa única aplicação, o site público de reservas, a área de cliente e um painel de administração completo (clientes, serviços, equipa, agenda, ponto de venda, caixa, faturação certificada e relatórios).

Projeto desenvolvido para o salão Chi Sublime (Cascais, Portugal). Interface e conteúdos em português (pt-PT), com suporte parcial a inglês em componentes bilingues.

---

## Índice

1. [Visão geral](#visão-geral)
2. [Stack tecnológica](#stack-tecnológica)
3. [Arquitetura e convenções](#arquitetura-e-convenções)
4. [Estrutura do projeto](#estrutura-do-projeto)
5. [Funcionalidades e estado atual](#funcionalidades-e-estado-atual)
6. [Modelos de dados](#modelos-de-dados)
7. [Faturação (Mock / Moloni)](#faturação-mock--moloni)
8. [Email e geração de PDF](#email-e-geração-de-pdf)
9. [Variáveis de ambiente](#variáveis-de-ambiente)
10. [Instalação e execução](#instalação-e-execução)
11. [Configuração necessária](#configuração-necessária)
12. [Estado do build e deploy](#estado-do-build-e-deploy)
13. [Trabalho em falta (roadmap)](#trabalho-em-falta-roadmap)
14. [Scripts](#scripts)
15. [Notas de manutenção](#notas-de-manutenção)

---

## Visão geral

A aplicação está organizada em três grandes áreas:

- **Site público** (`/`, `/servicos`, `/reservar`): apresentação do salão e fluxo de marcação online.
- **Área de cliente** (`/conta`): perfil, reservas e segurança do utilizador autenticado.
- **Painel de administração** (`/admin`): gestão operacional e financeira do salão, acessível apenas a utilizadores com perfil de administrador.

O modelo de acesso tem apenas dois papéis: `client` e `admin`. Os profissionais do salão (equipa) são registos de perfil geridos pelo administrador e **não possuem conta de login própria** — toda a gestão (agenda, horários, faturação) é feita pelo administrador.

---

## Stack tecnológica

| Camada             | Tecnologia                                                    |
| ------------------ | ------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack)                            |
| Runtime UI         | React 19                                                      |
| Linguagem          | TypeScript 5 (modo estrito)                                   |
| Base de dados      | MongoDB via Mongoose 9                                        |
| Autenticação       | NextAuth v5 (beta) + `@auth/mongodb-adapter`                  |
| Estilos            | Tailwind CSS v4 (tokens via `@theme`, sem ficheiro de config) |
| Formulários        | React Hook Form + `@hookform/resolvers`                       |
| Validação          | Zod                                                           |
| Email              | Resend + React Email                                          |
| PDF                | `@react-pdf/renderer`                                         |
| Faturação          | Moloni (API v1) — abstração com fallback Mock                 |
| Uploads            | Cloudinary (`next-cloudinary`)                                |
| Ícones             | lucide-react                                                  |
| Datas              | date-fns / date-fns-tz                                        |
| Gráficos / tabelas | recharts, `@tanstack/react-table` (disponíveis)               |
| i18n               | next-intl (parcial)                                           |
| Utilitários        | clsx, tailwind-merge, nanoid, papaparse, xlsx                 |

---

## Arquitetura e convenções

Estas convenções são transversais a todo o código e devem ser respeitadas em qualquer nova funcionalidade.

- **Valores monetários em cêntimos.** Toda a lógica de negócio guarda e calcula dinheiro como inteiros (cêntimos). A conversão para/de euros acontece apenas na fronteira da UI. Helpers em `src/lib/utils/cents.ts` (`eurosToCents`, `centsToEuros`, `calculateVAT`, `applyDiscount`).

- **Contrato uniforme de resultado (`ActionResult`).** As server actions mais recentes devolvem `{ success: true, data } | { success: false, error: { code, message, fieldErrors } }` (definido em `src/types/common.ts`, com os helpers `ok()` e `fail()`, e `Paginated<T>` para listas). A UI lê sempre `result.error.message` e hidrata `result.error.fieldErrors` nos formulários. Algumas actions antigas (`admin-bookings.ts`, `auth.ts`) usam ainda um formato inline `{ success, error: string }`.

- **Server actions como camada principal.** A aplicação usa server actions para praticamente toda a leitura/escrita. As rotas em `src/app/api` existem como pontos de extensão REST, mas a maioria está por implementar (ver roadmap).

- **Validação isolada da base de dados.** Os schemas Zod em `src/lib/validation/` não importam modelos Mongoose (para não arrastar o Mongoose para o bundle de cliente através dos resolvers do RHF); usam enums literais.

- **Soft-delete.** Entidades referenciadas por histórico (clientes, serviços, equipa, categorias) são desativadas (`active: false`) em vez de removidas.

- **Autorização.** Páginas de servidor protegem-se com `requireAdmin()` (redireciona). As actions validam a sessão com um guarda local que devolve `null` quando não há administrador.

- **Design tokens.** Paleta e tipografia definidas como tokens `chi-*` em `globals.css` (`chi-green-deep`, `chi-gold`, `chi-cream`, `chi-charcoal`, `chi-border`, estados `chi-success/danger/warning/info`, etc.). Tipos de letra: `font-serif` (Fraunces) e `font-sans` (Manrope). Helper `cn()` em `src/lib/utils/cn.ts`.

- **Cabeçalho de caminho em cada ficheiro.** Todos os ficheiros começam com um comentário `// 📄 caminho/do/ficheiro` para evitar ambiguidade em revisões e cópias.

---

## Estrutura do projeto

```
src/
├── app/                          App Router (rotas)
│   ├── (público)                 /, servicos, reservar, entrar, registar,
│   │                             recuperar-password, redefinir-password
│   ├── conta/                    Área de cliente (perfil, reservas, seguranca)
│   ├── admin/                    Painel de administração
│   │   ├── dashboard, reservas, clientes, servicos, equipa,
│   │   ├── receitas, despesas, caixa,
│   │   ├── relatorios/ (financeiro, iva, staff, clientes),
│   │   ├── definicoes/ (faturacao, empresa, notificacoes, utilizadores),
│   │   └── conteudo, horarios, galeria
│   └── api/
│       ├── auth/[...nextauth]    Autenticação (implementado)
│       ├── pdf/financial         Download do relatório financeiro (implementado)
│       ├── clients, services, staff, transactions, invoices  (stubs 501)
│       ├── cron/ (reminders, recurring-expenses)             (stubs 501)
│       ├── upload                                            (stub 501)
│       └── webhooks/resend                                   (stub 501)
│
├── components/
│   ├── ui/                       Sistema de componentes base
│   ├── admin/                    agenda, cash, checkout, clients, dashboard,
│   │                             layout, reports, services, settings, staff,
│   │                             transactions
│   ├── auth/, booking/, client-area/, home/, layout/,
│   └── services/, team/, shared/
│
├── lib/
│   ├── auth/                     Configuração NextAuth + permissões
│   ├── db/                       Ligação ao MongoDB
│   ├── models/                   Modelos Mongoose (ver secção Modelos)
│   ├── validation/               Schemas Zod
│   ├── server-actions/           Lógica de negócio (clients, services, staff,
│   │                             transactions, cash-register, reports, settings,
│   │                             bookings, admin-bookings, auth)
│   ├── invoicing/                Abstração de faturação + Mock + Moloni
│   ├── email/                    Resend + templates React Email
│   ├── pdf/                      Geração de PDF + templates
│   ├── booking/, cloudinary/, constants/, utils/
│   └── types/                    Tipos partilhados (ActionResult, DTOs)
│
├── hooks/                        useToast, useDebounce
└── proxy.ts                      Middleware (proxy)
```

Ficheiros de configuração na raiz: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.

---

## Funcionalidades e estado atual

Legenda: **Completo** (funcional e navegável) · **Parcial** (existe mas incompleto) · **Placeholder** (rota válida, "em construção") · **Stub** (endpoint devolve 501).

### Painel de administração

| Módulo                                             | Rota                                       | Estado        | Notas                                                                              |
| -------------------------------------------------- | ------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| Clientes                                           | `/admin/clientes`                          | Completo      | CRUD, pesquisa, filtros, paginação, bloquear/desbloquear, desativar                |
| Serviços e categorias                              | `/admin/servicos`                          | Completo      | Separadores Serviços/Categorias; preço, IVA, duração, profissionais                |
| Equipa                                             | `/admin/equipa` e `/admin/equipa/[id]`     | Completo      | Lista + detalhe com perfil, editor de horário semanal e gestão de férias           |
| Despesas                                           | `/admin/despesas`                          | Completo      | Registo, categorias, ver detalhe, reembolso; recorrência opcional                  |
| Receitas / POS                                     | `/admin/receitas`                          | Completo      | Ponto de venda em painel único; aciona a faturação                                 |
| Caixa                                              | `/admin/caixa`                             | Completo      | Abertura, fecho "blind" (contado antes do esperado), diferença + motivo, histórico |
| Relatório financeiro                               | `/admin/relatorios/financeiro`             | Completo      | Período com presets, KPIs, detalhe por categoria, IVA, exportação PDF              |
| Definições — Faturação                             | `/admin/definicoes/faturacao`              | Completo      | Escolha de provider e configuração dos IDs Moloni pela interface                   |
| Definições — Hub                                   | `/admin/definicoes`                        | Completo      | Índice das secções de configuração                                                 |
| Dashboard, Agenda/Reservas                         | `/admin/dashboard`, `/admin/reservas`      | Pré-existente | Construídos em fases anteriores; não revistos nesta iteração                       |
| Relatórios IVA / Equipa / Clientes                 | `/admin/relatorios/*`                      | Placeholder   | Índice pronto; relatórios por construir                                            |
| Definições — Empresa / Notificações / Utilizadores | `/admin/definicoes/*`                      | Placeholder   | Por construir                                                                      |
| Conteúdo, Horários, Galeria                        | `/admin/conteudo`, `/horarios`, `/galeria` | Placeholder   | Por construir                                                                      |
| Detalhe de reserva                                 | `/admin/reservas/[id]`                     | Placeholder   | Por construir                                                                      |

### Site público e área de cliente

Construídos em fases anteriores (não revistos nesta iteração): site de reservas (`/reservar`), catálogo de serviços (`/servicos`), autenticação (`/entrar`, `/registar`, recuperação de password) e área de cliente (`/conta`). O registo de conta e a recuperação de password disparam emails transacionais.

### Sistema de componentes de UI (`src/components/ui`)

Completo: Button, Badge, Card, Input, Label, Modal, Select, Textarea, Spinner, Toast (com `ToastProvider`), EmptyState, Checkbox, RadioGroup, DatePicker, TimePicker, Skeleton, Pagination, Tabs, Accordion, Drawer.

O `ToastProvider` está montado no layout raiz (`src/app/layout.tsx`), dentro do `SessionProvider`.

---

## Modelos de dados

Modelos Mongoose em `src/lib/models/` (barrel em `index.ts`):

`User`, `Client`, `Staff`, `Service`, `Category`, `IncomeCategory`, `ExpenseCategory`, `Transaction`, `CashRegister`, `Booking`, `Schedule`, `ClientServiceHistory`, `FiscalSettings`, `GiftCard`, `SiteContent`, `AuditLog`, `Counter`.

Pontos a reter:

- **Transaction**: campo `type` (`income`/`expense`), `amount` (líquido, cêntimos), `vatAmount`, `totalWithVat`, `tipAmount`, referência a `IncomeCategory`/`ExpenseCategory`, `status` (`completed`/`refunded`/`pending`/`cancelled`) e um sub-documento `invoiceData`. Os relatórios e a caixa contam apenas `completed`.
- **Staff**: inclui um campo opcional `userId` (ligação a `User`) preparado para um eventual login de profissionais, atualmente não utilizado.
- **FiscalSettings**: documento único (`key: 'default'`) com `invoiceProvider`, `defaultVatRate`, `vatExemptionReason`, prefixos e o sub-documento `moloni` (tokens OAuth + IDs de configuração).

---

## Faturação (Mock / Moloni)

A faturação está desenhada como uma abstração (`src/lib/invoicing/`):

- `InvoiceProvider.ts` — interface e tipos comuns.
- `MockProvider.ts` — provider de testes (documentos fictícios; permite validar todo o fluxo sem faturação real).
- `MoloniProvider.ts` + `MoloniAuth.ts` — integração com a API v1 do Moloni (OAuth2 com refresh de token, resolução de cliente por NIF, emissão de fatura-recibo, obtenção do PDF).
- `issueInvoiceAction.ts` — `issueInvoiceAction` (emite com cliente explícito) e `retryInvoiceAction` (deriva o cliente da transação).
- `index.ts` — fábrica `getInvoiceProvider()`.

Estado: **Mock** e **Moloni** implementados. Os providers `invoicexpress`, `vendus` e `atura` estão previstos na fábrica mas **não implementados** (lançam erro). O ponto de venda regista sempre a venda; a emissão de fatura é tentada a seguir e, se falhar (por exemplo, Moloni não configurado), a transação fica marcada como pendente para reemissão.

Só o tipo de documento **FR (fatura-recibo)** está implementado no Moloni. Assume-se uma única taxa de IVA por transação.

---

## Email e geração de PDF

**Email** (`src/lib/email/`): infraestrutura Resend (`resend.ts`), remetentes de alto nível (`send.ts`) e templates React Email (boas-vindas, verificação, recuperação de password, confirmação/lembrete/cancelamento de reserva, fatura-recibo). Sem `RESEND_API_KEY`, o sistema entra em modo mock e regista o email no terminal em vez de o enviar.

**PDF** (`src/lib/pdf/`): geração com `@react-pdf/renderer` (`generate.ts`) e templates para talão de balcão (não fiscal), relatório financeiro e fecho de caixa. A rota de download `GET /api/pdf/financial` já serve o relatório financeiro; rotas de download para os restantes PDFs ainda não foram criadas.

---

## Variáveis de ambiente

Criar um ficheiro `.env.local` na raiz. Confirmar os nomes exatos em `src/lib/auth`, `src/lib/db` e `src/lib/cloudinary` antes de produção.

### Base de dados e autenticação

```
MONGODB_URI=...                     # string de ligação MongoDB
AUTH_SECRET=...                     # segredo NextAuth v5 (gerar com: npx auth secret)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Email (Resend)

```
RESEND_API_KEY=...                  # sem esta chave, emails vão para o terminal (mock)
RESEND_FROM_EMAIL=...               # remetente verificado (domínio com DKIM/SPF)
```

### Faturação (Moloni)

```
MOLONI_CLIENT_ID=...
MOLONI_CLIENT_SECRET=...
MOLONI_USERNAME=...
MOLONI_PASSWORD=...
MOLONI_BASE_URL=https://api.moloni.pt/sandbox/    # sandbox para testes; produção: https://api.moloni.pt/v1/
MOLONI_COMPANY_ID=...               # opcional (também pode vir do FiscalSettings)
```

### Uploads (Cloudinary)

```
# Confirmar os nomes usados em src/lib/cloudinary (tipicamente):
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

As credenciais do Moloni ficam sempre em variáveis de ambiente. Os IDs específicos da conta (Company ID, série, imposto de IVA, cliente Consumidor Final, método de pagamento) configuram-se pela interface em Definições > Faturação.

---

## Instalação e execução

Pré-requisitos: Node.js 20 ou superior e acesso a uma instância MongoDB.

```
# 1. Instalar dependências
npm install

# 2. Configurar o ambiente
cp .env.example .env.local        # criar/preencher conforme a secção anterior

# 3. Ambiente de desenvolvimento
npm run dev                       # http://localhost:3000

# 4. Build de produção
npm run build
npm run start
```

Notas:

- É necessário um utilizador com perfil `admin` na base de dados para aceder a `/admin`. Sem sessão de administrador, as rotas de admin redirecionam para o login.
- Em desenvolvimento, o Next compila as rotas apenas quando são visitadas; um erro de rota pode só aparecer no primeiro acesso.

---

## Configuração necessária

Passos para colocar as integrações a funcionar a sério (para além do CRUD, que funciona apenas com o MongoDB ligado):

1. **MongoDB** — definir `MONGODB_URI` e criar um utilizador administrador.
2. **NextAuth** — definir `AUTH_SECRET`.
3. **Resend (email real)** — definir `RESEND_API_KEY` e `RESEND_FROM_EMAIL`, e verificar o domínio de envio (DKIM/SPF). Sem chave, funciona em modo mock (terminal).
4. **Moloni (faturação real)**:
   - Definir as credenciais nas variáveis de ambiente e apontar `MOLONI_BASE_URL` ao sandbox.
   - Em Definições > Faturação, preencher Company ID, série (document set), imposto de IVA (tax ID), cliente Consumidor Final e método de pagamento, e mudar o provider para Moloni.
   - Testar uma emissão no sandbox antes de mudar `MOLONI_BASE_URL` para produção.
5. **Cloudinary** — necessário para uploads de imagens (fotos de serviços/equipa), assim que o endpoint de upload for implementado.
6. **Cron jobs** — os endpoints `api/cron/reminders` e `api/cron/recurring-expenses` estão como stubs; quando implementados, agendar (por exemplo, via Vercel Cron).

---

## Estado do build e deploy

O comando `npm run build` conclui com sucesso: compilação, verificação de TypeScript e geração de páginas sem erros. A aplicação está pronta para deploy (por exemplo, Vercel), desde que as variáveis de ambiente estejam definidas na plataforma.

Todas as rotas admin respondem (200, redirect ou placeholder). As rotas API não implementadas respondem 501 de forma controlada, mantendo o build válido.

---

## Trabalho em falta (roadmap)

### Endpoints por implementar (atualmente stubs 501)

- `api/webhooks/resend` — processamento de eventos de email (entregue, aberto, bounce).
- `api/cron/reminders` — envio de lembretes de marcação.
- `api/cron/recurring-expenses` — geração automática de despesas recorrentes.
- `api/upload` — upload de imagens (Cloudinary).
- `api/clients`, `api/services`, `api/staff`, `api/transactions`, `api/invoices` (e respetivos `[id]`) — API REST; opcionais se a aplicação continuar a assentar em server actions.

### Ecrãs por construir (atualmente placeholders)

- Relatórios de IVA, Equipa e Clientes (a agregação já existe para o financeiro e pode ser estendida).
- Definições: Empresa, Notificações, Utilizadores.
- Conteúdo, Horários, Galeria.
- Detalhe de reserva no admin (`/admin/reservas/[id]`).

### Melhorias e dívida técnica

- **Avisos do Mongoose** ("Duplicate schema index") nos modelos `Schedule` e `AuditLog`: um índice está declarado duas vezes (`index: true` e `schema.index()`). Não afeta o funcionamento, mas deve ser limpo removendo a declaração duplicada.
- **Rotas de download de PDF** para o talão de balcão e o fecho de caixa (o gerador já existe).
- **Login de profissionais (opcional)**: o campo `Staff.userId` está preparado, mas o self-service da equipa não está implementado (decisão de manter gestão exclusiva pelo administrador).
- **Cobertura de testes**: não existem testes automatizados.

---

## Scripts

```
npm run dev        # desenvolvimento (Turbopack)
npm run build      # build de produção
npm run start      # servir o build de produção
npm run lint       # ESLint
```

Verificação de tipos recomendada antes de commits: `npx tsc --noEmit` (deve terminar com zero erros).

---

## Notas de manutenção

- **Novas server actions** devem seguir o contrato `ActionResult` de `src/types/common.ts` e validar a entrada com Zod.
- **Novos ecrãs de listagem** devem reutilizar o padrão já estabelecido (filtros no topo, `Pagination`, estados de carregamento com `Skeleton`, estados vazios com `EmptyState`, ações destrutivas com confirmação explícita).
- **Ficheiros de rota vazios partem o build de produção.** Antes de um build, confirmar que não há `page.tsx` nem `route.ts` a zero bytes:

  ```powershell
  Get-ChildItem -Recurse src/app -Include page.tsx,route.ts | Where-Object { $_.Length -eq 0 } | Select-Object FullName
  ```

- **Páginas estáticas que usam `useSearchParams`** (diretamente ou via componente) têm de estar envolvidas em `<Suspense>` ou marcadas como dinâmicas (`export const dynamic = 'force-dynamic'`), caso contrário o build falha na pré-renderização.

---

Documento gerado como referência de estado do projeto. Para dúvidas sobre módulos específicos, consultar o código na pasta correspondente em `src/lib/server-actions` (lógica) e `src/components/admin` (interface).
