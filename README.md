# Chi Sublime

Plataforma de gestÃ£o para salÃ£o de cabeleireiro e estÃ©tica. ReÃºne, numa Ãºnica aplicaÃ§Ã£o, o site pÃºblico de reservas, a Ã¡rea de cliente e um painel de administraÃ§Ã£o completo (clientes, serviÃ§os, equipa, agenda, ponto de venda, caixa, faturaÃ§Ã£o certificada e relatÃ³rios).

Projeto desenvolvido para o salÃ£o Chi Sublime (Cascais, Portugal). Interface e conteÃºdos em portuguÃªs (pt-PT), com suporte parcial a inglÃªs em componentes bilingues.

---

## Ãndice

1. [VisÃ£o geral](#visÃ£o-geral)
2. [Stack tecnolÃ³gica](#stack-tecnolÃ³gica)
3. [Arquitetura e convenÃ§Ãµes](#arquitetura-e-convenÃ§Ãµes)
4. [Estrutura do projeto](#estrutura-do-projeto)
5. [Funcionalidades e estado atual](#funcionalidades-e-estado-atual)
6. [Modelos de dados](#modelos-de-dados)
7. [FaturaÃ§Ã£o (Mock / Moloni)](#faturaÃ§Ã£o-mock--moloni)
8. [Email e geraÃ§Ã£o de PDF](#email-e-geraÃ§Ã£o-de-pdf)
9. [VariÃ¡veis de ambiente](#variÃ¡veis-de-ambiente)
10. [InstalaÃ§Ã£o e execuÃ§Ã£o](#instalaÃ§Ã£o-e-execuÃ§Ã£o)
11. [ConfiguraÃ§Ã£o necessÃ¡ria](#configuraÃ§Ã£o-necessÃ¡ria)
12. [Estado do build e deploy](#estado-do-build-e-deploy)
13. [Trabalho em falta (roadmap)](#trabalho-em-falta-roadmap)
14. [Scripts](#scripts)
15. [Notas de manutenÃ§Ã£o](#notas-de-manutenÃ§Ã£o)

---

## VisÃ£o geral

A aplicaÃ§Ã£o estÃ¡ organizada em trÃªs grandes Ã¡reas:

- **Site pÃºblico** (`/`, `/servicos`, `/marcacoes`): apresentaÃ§Ã£o do salÃ£o e fluxo de marcaÃ§Ã£o online.
- **Ãrea de cliente** (`/conta`): perfil, reservas e seguranÃ§a do utilizador autenticado.
- **Painel de administraÃ§Ã£o** (`/admin`): gestÃ£o operacional e financeira do salÃ£o, acessÃ­vel apenas a utilizadores com perfil de administrador.

O modelo de acesso tem apenas dois papÃ©is: `client` e `admin`. Os profissionais do salÃ£o (equipa) sÃ£o registos de perfil geridos pelo administrador e **nÃ£o possuem conta de login prÃ³pria** â€” toda a gestÃ£o (agenda, horÃ¡rios, faturaÃ§Ã£o) Ã© feita pelo administrador.

---

## Stack tecnolÃ³gica

| Camada             | Tecnologia                                                    |
| ------------------ | ------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack)                            |
| Runtime UI         | React 19                                                      |
| Linguagem          | TypeScript 5 (modo estrito)                                   |
| Base de dados      | MongoDB via Mongoose 9                                        |
| AutenticaÃ§Ã£o       | NextAuth v5 (beta) + `@auth/mongodb-adapter`                  |
| Estilos            | Tailwind CSS v4 (tokens via `@theme`, sem ficheiro de config) |
| FormulÃ¡rios        | React Hook Form + `@hookform/resolvers`                       |
| ValidaÃ§Ã£o          | Zod                                                           |
| Email              | Resend + React Email                                          |
| PDF                | `@react-pdf/renderer`                                         |
| FaturaÃ§Ã£o          | Moloni (API v1) â€” abstraÃ§Ã£o com fallback Mock                 |
| Uploads            | Cloudinary (`next-cloudinary`)                                |
| Ãcones             | lucide-react                                                  |
| Datas              | date-fns / date-fns-tz                                        |
| GrÃ¡ficos / tabelas | recharts, `@tanstack/react-table` (disponÃ­veis)               |
| i18n               | next-intl (parcial)                                           |
| UtilitÃ¡rios        | clsx, tailwind-merge, nanoid, papaparse, xlsx                 |

---

## Arquitetura e convenÃ§Ãµes

Estas convenÃ§Ãµes sÃ£o transversais a todo o cÃ³digo e devem ser respeitadas em qualquer nova funcionalidade.

- **Valores monetÃ¡rios em cÃªntimos.** Toda a lÃ³gica de negÃ³cio guarda e calcula dinheiro como inteiros (cÃªntimos). A conversÃ£o para/de euros acontece apenas na fronteira da UI. Helpers em `src/lib/utils/cents.ts` (`eurosToCents`, `centsToEuros`, `calculateVAT`, `applyDiscount`).

- **Contrato uniforme de resultado (`ActionResult`).** As server actions mais recentes devolvem `{ success: true, data } | { success: false, error: { code, message, fieldErrors } }` (definido em `src/types/common.ts`, com os helpers `ok()` e `fail()`, e `Paginated<T>` para listas). A UI lÃª sempre `result.error.message` e hidrata `result.error.fieldErrors` nos formulÃ¡rios. Algumas actions antigas (`admin-bookings.ts`, `auth.ts`) usam ainda um formato inline `{ success, error: string }`.

- **Server actions como camada principal.** A aplicaÃ§Ã£o usa server actions para praticamente toda a leitura/escrita. As rotas em `src/app/api` existem como pontos de extensÃ£o REST, mas a maioria estÃ¡ por implementar (ver roadmap).

- **ValidaÃ§Ã£o isolada da base de dados.** Os schemas Zod em `src/lib/validation/` nÃ£o importam modelos Mongoose (para nÃ£o arrastar o Mongoose para o bundle de cliente atravÃ©s dos resolvers do RHF); usam enums literais.

- **Soft-delete.** Entidades referenciadas por histÃ³rico (clientes, serviÃ§os, equipa, categorias) sÃ£o desativadas (`active: false`) em vez de removidas.

- **AutorizaÃ§Ã£o.** PÃ¡ginas de servidor protegem-se com `requireAdmin()` (redireciona). As actions validam a sessÃ£o com um guarda local que devolve `null` quando nÃ£o hÃ¡ administrador.

- **Design tokens.** Paleta e tipografia definidas como tokens `chi-*` em `globals.css` (`chi-green-deep`, `chi-gold`, `chi-cream`, `chi-charcoal`, `chi-border`, estados `chi-success/danger/warning/info`, etc.). Tipos de letra: `font-serif` (Fraunces) e `font-sans` (Manrope). Helper `cn()` em `src/lib/utils/cn.ts`.

- **CabeÃ§alho de caminho em cada ficheiro.** Todos os ficheiros comeÃ§am com um comentÃ¡rio `// ðŸ“„ caminho/do/ficheiro` para evitar ambiguidade em revisÃµes e cÃ³pias.

---

## Estrutura do projeto

```
src/
â”œâ”€â”€ app/                          App Router (rotas)
â”‚   â”œâ”€â”€ (pÃºblico)                 /, servicos, reservar, entrar, registar,
â”‚   â”‚                             recuperar-password, redefinir-password
â”‚   â”œâ”€â”€ conta/                    Ãrea de cliente (perfil, reservas, seguranca)
â”‚   â”œâ”€â”€ admin/                    Painel de administraÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ dashboard, reservas, clientes, servicos, equipa,
â”‚   â”‚   â”œâ”€â”€ receitas, despesas, caixa,
â”‚   â”‚   â”œâ”€â”€ relatorios/ (financeiro, iva, staff, clientes),
â”‚   â”‚   â”œâ”€â”€ definicoes/ (faturacao, empresa, notificacoes, utilizadores),
â”‚   â”‚   â””â”€â”€ conteudo, horarios, galeria
â”‚   â””â”€â”€ api/
â”‚       â”œâ”€â”€ auth/[...nextauth]    AutenticaÃ§Ã£o (implementado)
â”‚       â”œâ”€â”€ pdf/financial         Download do relatÃ³rio financeiro (implementado)
â”‚       â”œâ”€â”€ clients, services, staff, transactions, invoices  (stubs 501)
â”‚       â”œâ”€â”€ cron/ (reminders, recurring-expenses)             (stubs 501)
â”‚       â”œâ”€â”€ upload                                            (stub 501)
â”‚       â””â”€â”€ webhooks/resend                                   (stub 501)
â”‚
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ ui/                       Sistema de componentes base
â”‚   â”œâ”€â”€ admin/                    agenda, cash, checkout, clients, dashboard,
â”‚   â”‚                             layout, reports, services, settings, staff,
â”‚   â”‚                             transactions
â”‚   â”œâ”€â”€ auth/, booking/, client-area/, home/, layout/,
â”‚   â””â”€â”€ services/, team/, shared/
â”‚
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ auth/                     ConfiguraÃ§Ã£o NextAuth + permissÃµes
â”‚   â”œâ”€â”€ db/                       LigaÃ§Ã£o ao MongoDB
â”‚   â”œâ”€â”€ models/                   Modelos Mongoose (ver secÃ§Ã£o Modelos)
â”‚   â”œâ”€â”€ validation/               Schemas Zod
â”‚   â”œâ”€â”€ server-actions/           LÃ³gica de negÃ³cio (clients, services, staff,
â”‚   â”‚                             transactions, cash-register, reports, settings,
â”‚   â”‚                             bookings, admin-bookings, auth)
â”‚   â”œâ”€â”€ invoicing/                AbstraÃ§Ã£o de faturaÃ§Ã£o + Mock + Moloni
â”‚   â”œâ”€â”€ email/                    Resend + templates React Email
â”‚   â”œâ”€â”€ pdf/                      GeraÃ§Ã£o de PDF + templates
â”‚   â”œâ”€â”€ booking/, cloudinary/, constants/, utils/
â”‚   â””â”€â”€ types/                    Tipos partilhados (ActionResult, DTOs)
â”‚
â”œâ”€â”€ hooks/                        useToast, useDebounce
â””â”€â”€ proxy.ts                      Middleware (proxy)
```

Ficheiros de configuraÃ§Ã£o na raiz: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.

---

## Funcionalidades e estado atual

Legenda: **Completo** (funcional e navegÃ¡vel) Â· **Parcial** (existe mas incompleto) Â· **Placeholder** (rota vÃ¡lida, "em construÃ§Ã£o") Â· **Stub** (endpoint devolve 501).

### Painel de administraÃ§Ã£o

| MÃ³dulo                                             | Rota                                       | Estado        | Notas                                                                              |
| -------------------------------------------------- | ------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| Clientes                                           | `/admin/clientes`                          | Completo      | CRUD, pesquisa, filtros, paginaÃ§Ã£o, bloquear/desbloquear, desativar                |
| ServiÃ§os e categorias                              | `/admin/servicos`                          | Completo      | Separadores ServiÃ§os/Categorias; preÃ§o, IVA, duraÃ§Ã£o, profissionais                |
| Equipa                                             | `/admin/equipa` e `/admin/equipa/[id]`     | Completo      | Lista + detalhe com perfil, editor de horÃ¡rio semanal e gestÃ£o de fÃ©rias           |
| Despesas                                           | `/admin/despesas`                          | Completo      | Registo, categorias, ver detalhe, reembolso; recorrÃªncia opcional                  |
| Receitas / POS                                     | `/admin/receitas`                          | Completo      | Ponto de venda em painel Ãºnico; aciona a faturaÃ§Ã£o                                 |
| Caixa                                              | `/admin/caixa`                             | Completo      | Abertura, fecho "blind" (contado antes do esperado), diferenÃ§a + motivo, histÃ³rico |
| RelatÃ³rio financeiro                               | `/admin/relatorios/financeiro`             | Completo      | PerÃ­odo com presets, KPIs, detalhe por categoria, IVA, exportaÃ§Ã£o PDF              |
| DefiniÃ§Ãµes â€” FaturaÃ§Ã£o                             | `/admin/definicoes/faturacao`              | Completo      | Escolha de provider e configuraÃ§Ã£o dos IDs Moloni pela interface                   |
| DefiniÃ§Ãµes â€” Hub                                   | `/admin/definicoes`                        | Completo      | Ãndice das secÃ§Ãµes de configuraÃ§Ã£o                                                 |
| Dashboard, Agenda/Reservas                         | `/admin/dashboard`, `/admin/reservas`      | PrÃ©-existente | ConstruÃ­dos em fases anteriores; nÃ£o revistos nesta iteraÃ§Ã£o                       |
| RelatÃ³rios IVA / Equipa / Clientes                 | `/admin/relatorios/*`                      | Placeholder   | Ãndice pronto; relatÃ³rios por construir                                            |
| DefiniÃ§Ãµes â€” Empresa / NotificaÃ§Ãµes / Utilizadores | `/admin/definicoes/*`                      | Placeholder   | Por construir                                                                      |
| ConteÃºdo, HorÃ¡rios, Galeria                        | `/admin/conteudo`, `/horarios`, `/galeria` | Placeholder   | Por construir                                                                      |
| Detalhe de reserva                                 | `/admin/reservas/[id]`                     | Placeholder   | Por construir                                                                      |

### Site pÃºblico e Ã¡rea de cliente

ConstruÃ­dos em fases anteriores (nÃ£o revistos nesta iteraÃ§Ã£o): site de reservas (`/marcacoes`), catÃ¡logo de serviÃ§os (`/servicos`), autenticaÃ§Ã£o (`/entrar`, `/registar`, recuperaÃ§Ã£o de password) e Ã¡rea de cliente (`/conta`). O registo de conta e a recuperaÃ§Ã£o de password disparam emails transacionais.

### Sistema de componentes de UI (`src/components/ui`)

Completo: Button, Badge, Card, Input, Label, Modal, Select, Textarea, Spinner, Toast (com `ToastProvider`), EmptyState, Checkbox, RadioGroup, DatePicker, TimePicker, Skeleton, Pagination, Tabs, Accordion, Drawer.

O `ToastProvider` estÃ¡ montado no layout raiz (`src/app/layout.tsx`), dentro do `SessionProvider`.

---

## Modelos de dados

Modelos Mongoose em `src/lib/models/` (barrel em `index.ts`):

`User`, `Client`, `Staff`, `Service`, `Category`, `IncomeCategory`, `ExpenseCategory`, `Transaction`, `CashRegister`, `Booking`, `Schedule`, `ClientServiceHistory`, `FiscalSettings`, `GiftCard`, `SiteContent`, `AuditLog`, `Counter`.

Pontos a reter:

- **Transaction**: campo `type` (`income`/`expense`), `amount` (lÃ­quido, cÃªntimos), `vatAmount`, `totalWithVat`, `tipAmount`, referÃªncia a `IncomeCategory`/`ExpenseCategory`, `status` (`completed`/`refunded`/`pending`/`cancelled`) e um sub-documento `invoiceData`. Os relatÃ³rios e a caixa contam apenas `completed`.
- **Staff**: inclui um campo opcional `userId` (ligaÃ§Ã£o a `User`) preparado para um eventual login de profissionais, atualmente nÃ£o utilizado.
- **FiscalSettings**: documento Ãºnico (`key: 'default'`) com `invoiceProvider`, `defaultVatRate`, `vatExemptionReason`, prefixos e o sub-documento `moloni` (tokens OAuth + IDs de configuraÃ§Ã£o).

---

## FaturaÃ§Ã£o (Mock / Moloni)

A faturaÃ§Ã£o estÃ¡ desenhada como uma abstraÃ§Ã£o (`src/lib/invoicing/`):

- `InvoiceProvider.ts` â€” interface e tipos comuns.
- `MockProvider.ts` â€” provider de testes (documentos fictÃ­cios; permite validar todo o fluxo sem faturaÃ§Ã£o real).
- `MoloniProvider.ts` + `MoloniAuth.ts` â€” integraÃ§Ã£o com a API v1 do Moloni (OAuth2 com refresh de token, resoluÃ§Ã£o de cliente por NIF, emissÃ£o de fatura-recibo, obtenÃ§Ã£o do PDF).
- `issueInvoiceAction.ts` â€” `issueInvoiceAction` (emite com cliente explÃ­cito) e `retryInvoiceAction` (deriva o cliente da transaÃ§Ã£o).
- `index.ts` â€” fÃ¡brica `getInvoiceProvider()`.

Estado: **Mock** e **Moloni** implementados. Os providers `invoicexpress`, `vendus` e `atura` estÃ£o previstos na fÃ¡brica mas **nÃ£o implementados** (lanÃ§am erro). O ponto de venda regista sempre a venda; a emissÃ£o de fatura Ã© tentada a seguir e, se falhar (por exemplo, Moloni nÃ£o configurado), a transaÃ§Ã£o fica marcada como pendente para reemissÃ£o.

SÃ³ o tipo de documento **FR (fatura-recibo)** estÃ¡ implementado no Moloni. Assume-se uma Ãºnica taxa de IVA por transaÃ§Ã£o.

---

## Email e geraÃ§Ã£o de PDF

**Email** (`src/lib/email/`): infraestrutura Resend (`resend.ts`), remetentes de alto nÃ­vel (`send.ts`) e templates React Email (boas-vindas, verificaÃ§Ã£o, recuperaÃ§Ã£o de password, confirmaÃ§Ã£o/lembrete/cancelamento de reserva, fatura-recibo). Sem `RESEND_API_KEY`, o sistema entra em modo mock e regista o email no terminal em vez de o enviar.

**PDF** (`src/lib/pdf/`): geraÃ§Ã£o com `@react-pdf/renderer` (`generate.ts`) e templates para talÃ£o de balcÃ£o (nÃ£o fiscal), relatÃ³rio financeiro e fecho de caixa. A rota de download `GET /api/pdf/financial` jÃ¡ serve o relatÃ³rio financeiro; rotas de download para os restantes PDFs ainda nÃ£o foram criadas.

---

## VariÃ¡veis de ambiente

Criar um ficheiro `.env.local` na raiz. Confirmar os nomes exatos em `src/lib/auth`, `src/lib/db` e `src/lib/cloudinary` antes de produÃ§Ã£o.

### Base de dados e autenticaÃ§Ã£o

```
MONGODB_URI=...                     # string de ligaÃ§Ã£o MongoDB
AUTH_SECRET=...                     # segredo NextAuth v5 (gerar com: npx auth secret)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Email (Resend)

```
RESEND_API_KEY=...                  # sem esta chave, emails vÃ£o para o terminal (mock)
RESEND_FROM_EMAIL=...               # remetente verificado (domÃ­nio com DKIM/SPF)
```

### FaturaÃ§Ã£o (Moloni)

```
MOLONI_CLIENT_ID=...
MOLONI_CLIENT_SECRET=...
MOLONI_USERNAME=...
MOLONI_PASSWORD=...
MOLONI_BASE_URL=https://api.moloni.pt/sandbox/    # sandbox para testes; produÃ§Ã£o: https://api.moloni.pt/v1/
MOLONI_COMPANY_ID=...               # opcional (tambÃ©m pode vir do FiscalSettings)
```

### Uploads (Cloudinary)

```
# Confirmar os nomes usados em src/lib/cloudinary (tipicamente):
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

As credenciais do Moloni ficam sempre em variÃ¡veis de ambiente. Os IDs especÃ­ficos da conta (Company ID, sÃ©rie, imposto de IVA, cliente Consumidor Final, mÃ©todo de pagamento) configuram-se pela interface em DefiniÃ§Ãµes > FaturaÃ§Ã£o.

---

## InstalaÃ§Ã£o e execuÃ§Ã£o

PrÃ©-requisitos: Node.js 20 ou superior e acesso a uma instÃ¢ncia MongoDB.

```
# 1. Instalar dependÃªncias
npm install

# 2. Configurar o ambiente
cp .env.example .env.local        # criar/preencher conforme a secÃ§Ã£o anterior

# 3. Ambiente de desenvolvimento
npm run dev                       # http://localhost:3000

# 4. Build de produÃ§Ã£o
npm run build
npm run start
```

Notas:

- Ã‰ necessÃ¡rio um utilizador com perfil `admin` na base de dados para aceder a `/admin`. Sem sessÃ£o de administrador, as rotas de admin redirecionam para o login.
- Em desenvolvimento, o Next compila as rotas apenas quando sÃ£o visitadas; um erro de rota pode sÃ³ aparecer no primeiro acesso.

---

## ConfiguraÃ§Ã£o necessÃ¡ria

Passos para colocar as integraÃ§Ãµes a funcionar a sÃ©rio (para alÃ©m do CRUD, que funciona apenas com o MongoDB ligado):

1. **MongoDB** â€” definir `MONGODB_URI` e criar um utilizador administrador.
2. **NextAuth** â€” definir `AUTH_SECRET`.
3. **Resend (email real)** â€” definir `RESEND_API_KEY` e `RESEND_FROM_EMAIL`, e verificar o domÃ­nio de envio (DKIM/SPF). Sem chave, funciona em modo mock (terminal).
4. **Moloni (faturaÃ§Ã£o real)**:
   - Definir as credenciais nas variÃ¡veis de ambiente e apontar `MOLONI_BASE_URL` ao sandbox.
   - Em DefiniÃ§Ãµes > FaturaÃ§Ã£o, preencher Company ID, sÃ©rie (document set), imposto de IVA (tax ID), cliente Consumidor Final e mÃ©todo de pagamento, e mudar o provider para Moloni.
   - Testar uma emissÃ£o no sandbox antes de mudar `MOLONI_BASE_URL` para produÃ§Ã£o.
5. **Cloudinary** â€” necessÃ¡rio para uploads de imagens (fotos de serviÃ§os/equipa), assim que o endpoint de upload for implementado.
6. **Cron jobs** â€” os endpoints `api/cron/reminders` e `api/cron/recurring-expenses` estÃ£o como stubs; quando implementados, agendar (por exemplo, via Vercel Cron).

---

## Estado do build e deploy

O comando `npm run build` conclui com sucesso: compilaÃ§Ã£o, verificaÃ§Ã£o de TypeScript e geraÃ§Ã£o de pÃ¡ginas sem erros. A aplicaÃ§Ã£o estÃ¡ pronta para deploy (por exemplo, Vercel), desde que as variÃ¡veis de ambiente estejam definidas na plataforma.

Todas as rotas admin respondem (200, redirect ou placeholder). As rotas API nÃ£o implementadas respondem 501 de forma controlada, mantendo o build vÃ¡lido.

---

## Trabalho em falta (roadmap)

### Endpoints por implementar (atualmente stubs 501)

- `api/webhooks/resend` â€” processamento de eventos de email (entregue, aberto, bounce).
- `api/cron/reminders` â€” envio de lembretes de marcaÃ§Ã£o.
- `api/cron/recurring-expenses` â€” geraÃ§Ã£o automÃ¡tica de despesas recorrentes.
- `api/upload` â€” upload de imagens (Cloudinary).
- `api/clients`, `api/services`, `api/staff`, `api/transactions`, `api/invoices` (e respetivos `[id]`) â€” API REST; opcionais se a aplicaÃ§Ã£o continuar a assentar em server actions.

### EcrÃ£s por construir (atualmente placeholders)

- RelatÃ³rios de IVA, Equipa e Clientes (a agregaÃ§Ã£o jÃ¡ existe para o financeiro e pode ser estendida).
- DefiniÃ§Ãµes: Empresa, NotificaÃ§Ãµes, Utilizadores.
- ConteÃºdo, HorÃ¡rios, Galeria.
- Detalhe de reserva no admin (`/admin/reservas/[id]`).

### Melhorias e dÃ­vida tÃ©cnica

- **Avisos do Mongoose** ("Duplicate schema index") nos modelos `Schedule` e `AuditLog`: um Ã­ndice estÃ¡ declarado duas vezes (`index: true` e `schema.index()`). NÃ£o afeta o funcionamento, mas deve ser limpo removendo a declaraÃ§Ã£o duplicada.
- **Rotas de download de PDF** para o talÃ£o de balcÃ£o e o fecho de caixa (o gerador jÃ¡ existe).
- **Login de profissionais (opcional)**: o campo `Staff.userId` estÃ¡ preparado, mas o self-service da equipa nÃ£o estÃ¡ implementado (decisÃ£o de manter gestÃ£o exclusiva pelo administrador).
- **Cobertura de testes**: nÃ£o existem testes automatizados.

---

## Scripts

```
npm run dev        # desenvolvimento (Turbopack)
npm run build      # build de produÃ§Ã£o
npm run start      # servir o build de produÃ§Ã£o
npm run lint       # ESLint
```

VerificaÃ§Ã£o de tipos recomendada antes de commits: `npx tsc --noEmit` (deve terminar com zero erros).

---

## Notas de manutenÃ§Ã£o

- **Novas server actions** devem seguir o contrato `ActionResult` de `src/types/common.ts` e validar a entrada com Zod.
- **Novos ecrÃ£s de listagem** devem reutilizar o padrÃ£o jÃ¡ estabelecido (filtros no topo, `Pagination`, estados de carregamento com `Skeleton`, estados vazios com `EmptyState`, aÃ§Ãµes destrutivas com confirmaÃ§Ã£o explÃ­cita).
- **Ficheiros de rota vazios partem o build de produÃ§Ã£o.** Antes de um build, confirmar que nÃ£o hÃ¡ `page.tsx` nem `route.ts` a zero bytes:

  ```powershell
  Get-ChildItem -Recurse src/app -Include page.tsx,route.ts | Where-Object { $_.Length -eq 0 } | Select-Object FullName
  ```

- **PÃ¡ginas estÃ¡ticas que usam `useSearchParams`** (diretamente ou via componente) tÃªm de estar envolvidas em `<Suspense>` ou marcadas como dinÃ¢micas (`export const dynamic = 'force-dynamic'`), caso contrÃ¡rio o build falha na prÃ©-renderizaÃ§Ã£o.

---

Documento gerado como referÃªncia de estado do projeto. Para dÃºvidas sobre mÃ³dulos especÃ­ficos, consultar o cÃ³digo na pasta correspondente em `src/lib/server-actions` (lÃ³gica) e `src/components/admin` (interface).
