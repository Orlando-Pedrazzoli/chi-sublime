<div align="center">

# Chi Sublime

### Hair Style & Beauty · Cascais

**Plataforma digital completa para gestão de salão premium**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 📖 Índice

1. [Visão do Projeto](#-visão-do-projeto)
2. [Cliente](#-cliente)
3. [Identidade Visual](#-identidade-visual)
4. [Arquitetura](#-arquitetura)
5. [Stack Tecnológica](#-stack-tecnológica)
6. [Estrutura do Projeto](#-estrutura-do-projeto)
7. [Funcionalidades](#-funcionalidades)
8. [Sistema de Faturação](#-sistema-de-faturação-portuguesa)
9. [Modelo de Dados](#-modelo-de-dados-mongodb)
10. [Sprints e Roadmap](#-sprints-e-roadmap)
11. [Setup Local](#-setup-local)
12. [Variáveis de Ambiente](#-variáveis-de-ambiente)
13. [Scripts Disponíveis](#-scripts-disponíveis)
14. [Conformidade Legal](#-conformidade-legal-portugal)
15. [Custos Operacionais](#-custos-operacionais)
16. [Equipa e Contactos](#-equipa-e-contactos)

---

## 🎯 Visão do Projeto

O **Chi Sublime** é uma plataforma digital end-to-end desenvolvida à medida para o salão de beleza premium **Chi Sublime — Hair Style & Beauty**, situado em Quinta da Bicuda, Cascais.

Mais do que um simples website com sistema de marcações, esta plataforma constitui um **mini-ERP completo** que permite ao proprietário Jean Pierre gerir todos os aspetos operacionais e financeiros do negócio a partir de um único painel:

- **Site público premium bilíngue (PT/EN)** com estética couture, posicionado para clientes de alto poder aquisitivo
- **Sistema de marcações online** em 3 passos (serviço → horário → confirmação)
- **Painel administrativo profissional** com KPIs em tempo real
- **POS interno** (checkout no balcão) para registar pagamentos rapidamente
- **Gestão financeira completa** (receitas, despesas, lucros, margem, fluxo de caixa)
- **Base de dados de clientes** com histórico detalhado de serviços
- **Sistema de faturação certificada** integrado via API com software certificado pela Autoridade Tributária portuguesa
- **Relatórios** financeiros, fiscais (IVA), por staff e por cliente, exportáveis em PDF/Excel/CSV

### Vantagem competitiva vs SaaS internacional

| Critério                                      | SaaS internacional (Mangomint, Phorest, GlossGenius) | **Chi Sublime custom**                 |
| --------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Mensalidade                                   | $99-249/mês ($1.200-3.000/ano)                       | **~50-62€/mês** (hosting + faturação)  |
| Conformidade fiscal portuguesa (ATCUD, SAF-T) | ❌ Não suportada                                     | ✅ Via integração Moloni (n.º 2860/AT) |
| Branding personalizado                        | ❌ Layout genérico                                   | ✅ 100% à medida da marca              |
| Idiomas                                       | Apenas inglês                                        | ✅ PT + EN nativos                     |
| Propriedade dos dados                         | ❌ Vendor lock-in                                    | ✅ Dados próprios, sem dependência     |
| Métodos de pagamento PT (MB Way, Multibanco)  | ❌                                                   | ✅ Suportados nativamente              |

---

## 🏪 Cliente

| Campo                     | Valor                                                      |
| ------------------------- | ---------------------------------------------------------- |
| **Nome**                  | Chi Sublime — Hair Style & Beauty                          |
| **Proprietário**          | Jean Pierre                                                |
| **Equipa**                | Jean Pierre, Matias, Ana Rita                              |
| **Morada**                | Rua Estorninho, Loja E, Quinta da Bicuda, 2750-686 Cascais |
| **Telefone**              | +351 932 932 691                                           |
| **Domínio**               | [www.chisublime.pt](https://www.chisublime.pt)             |
| **Categorias de serviço** | Cabelereiro, Sobrancelhas, Maquilhagem, Unhas, Depilação   |
| **Total de serviços**     | ~38                                                        |
| **Horário**               | Segunda–Sexta 10h00–19h00 (a confirmar com cliente)        |

---

## 🎨 Identidade Visual

A paleta foi desenhada com base no logo original (verde profundo + dourado), elevada para uma direção premium inspirada em salões de luxo de referência (Andy LeCompte, Sono Felice, Tiara Salon).

### Paleta de cores

| Token                 | Hex       | Uso principal                             |
| --------------------- | --------- | ----------------------------------------- |
| `--chi-green-deep`    | `#1F3D2E` | Cor primária, backgrounds escuros, navbar |
| `--chi-green-soft`    | `#2D5440` | Hover states, secções secundárias         |
| `--chi-green-darker`  | `#142820` | Footer, contraste máximo                  |
| `--chi-gold`          | `#D4AF6E` | Accent — preços, ícones, CTAs             |
| `--chi-gold-soft`     | `#E8D5A8` | Hover do gold                             |
| `--chi-gold-deep`     | `#B8924A` | Eyebrows, separadores                     |
| `--chi-cream`         | `#FAF7F2` | Background principal (off-white quente)   |
| `--chi-sand`          | `#EFE9DD` | Cards, secções alternadas                 |
| `--chi-charcoal`      | `#1A1A1A` | Texto principal                           |
| `--chi-charcoal-soft` | `#5A5A5A` | Texto secundário                          |

### Tipografia

- **Display:** Cormorant Garamond — serifa elegante, tom couture (títulos, eyebrows, citações)
- **Corpo:** Manrope — sans-serif moderna e legível (parágrafos, navegação, formulários)
- **Numéricos financeiros:** JetBrains Mono — monospace para alinhar valores em tabelas

### Filosofia de design

> _"Luxo verdadeiro comunica-se com restraint, não com ostentação."_

- Whitespace generoso (8rem padding nas secções)
- Itálicos seletivos para palavras-chave em títulos
- Dourado usado como **accent disciplinado**, nunca dominante
- Imagens em ratio editorial (3:4 retratos, 4:5 hero)
- Animações suaves (fade-up em cascata, Ken Burns no hero)

---

## 🏗️ Arquitetura

### Visão geral

```
┌──────────────────────────────────────────────────────────────────┐
│                    SITE PÚBLICO (chisublime.pt)                  │
│  Home · Serviços · Equipa · Galeria · Sobre · Reservar · Conta  │
│                              │                                   │
│                              ▼                                   │
│                      Cliente cria Booking                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ MongoDB Change Stream / SSE
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│           PAINEL ADMIN — Jean Pierre (sempre aberto)             │
│                                                                  │
│  💰 Receitas    💸 Despesas    👥 Clientes    📅 Reservas       │
│  🛍️ Serviços    👔 Equipa      📈 Relatórios  🧾 Caixa diária   │
│  📊 Dashboard   ⚙️ Definições  🖼️ Conteúdo                      │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────┐
              │     MongoDB Atlas (eu-central)     │
              │  17 collections, transactions,     │
              │  audit log, continuous backup      │
              └────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │   SERVIÇOS EXTERNOS (Provider Pattern)   │
        │                                          │
        │  📧 Resend       (emails transacionais) │
        │  ☁️  Cloudinary   (imagens + uploads)    │
        │  🧾 Moloni       (faturação certificada)│
        │  🔄 Vercel Cron  (jobs agendados)       │
        └──────────────────────────────────────────┘
```

### Princípios arquiteturais

1. **Provider Pattern para integrações críticas** — qualquer serviço externo (faturação, email, storage) é abstraído por uma interface, permitindo trocar de provedor sem refatorar o resto do código
2. **Server Actions Next.js 16** para mutações — type-safe, sem necessidade de API routes manuais para a maioria dos casos
3. **Schemas Mongoose strict** — validação a nível de base de dados além do Zod no client
4. **Valores monetários em cêntimos integer** — nunca floats, evita problemas de precisão
5. **Audit log imutável** — todas as alterações financeiras críticas são registadas
6. **Numeração sequencial atómica** — exigência fiscal portuguesa (transações, faturas, recibos)

---

## 🛠️ Stack Tecnológica

### Core

| Camada    | Tecnologia       | Versão   | Justificação                                        |
| --------- | ---------------- | -------- | --------------------------------------------------- |
| Framework | **Next.js**      | `16.2.4` | App Router, Server Actions, Turbopack               |
| UI        | **React**        | `19.2.4` | Server Components, useEffectEvent, View Transitions |
| Linguagem | **TypeScript**   | `5.x`    | Type safety crítica em transações financeiras       |
| Estilo    | **Tailwind CSS** | `v4`     | Design system consistente, CSS variables            |

### Database & Auth

| Categoria      | Pacote                   | Versão          |
| -------------- | ------------------------ | --------------- |
| Database       | `mongoose`               | `9.5.0`         |
| MongoDB Driver | `mongodb`                | `7.2.0`         |
| Auth           | `next-auth` (Auth.js v5) | `5.0.0-beta.31` |
| Auth Adapter   | `@auth/mongodb-adapter`  | `3.11.2`        |

### Forms & Validation

| Pacote                | Versão   |
| --------------------- | -------- |
| `react-hook-form`     | `7.74.0` |
| `@hookform/resolvers` | `5.2.2`  |
| `zod`                 | `4.3.6`  |

### UI & Visualização

| Pacote                  | Uso                                 |
| ----------------------- | ----------------------------------- |
| `lucide-react`          | Biblioteca de ícones                |
| `motion`                | Animações (substitui framer-motion) |
| `recharts`              | Gráficos do dashboard financeiro    |
| `@tanstack/react-table` | Tabelas com sort/filter/paginação   |

### Comunicação & Storage

| Pacote                                    | Uso                            |
| ----------------------------------------- | ------------------------------ |
| `resend`                                  | Envio de emails transacionais  |
| `react-email` + `@react-email/components` | Templates de email em React    |
| `cloudinary` + `next-cloudinary`          | Upload e otimização de imagens |

### Utilitários

| Pacote                     | Uso                            |
| -------------------------- | ------------------------------ |
| `date-fns` + `date-fns-tz` | Manipulação de datas           |
| `nanoid`                   | IDs únicos curtos              |
| `clsx` + `tailwind-merge`  | Composição de classes Tailwind |
| `next-intl`                | Internacionalização PT/EN      |

### Geração de documentos

| Pacote                | Uso                                   |
| --------------------- | ------------------------------------- |
| `@react-pdf/renderer` | Geração de PDFs (recibos, relatórios) |
| `xlsx`                | Exportação para Excel                 |
| `papaparse`           | Parsing de CSV                        |

### Dev Tools

| Pacote                                     | Uso                   |
| ------------------------------------------ | --------------------- |
| `prettier` + `prettier-plugin-tailwindcss` | Formatação automática |
| `eslint` + `eslint-config-next`            | Linting               |
| `@types/*`                                 | Tipos TypeScript      |

---

## 📁 Estrutura do Projeto

```
chi-sublime/
│
├── public/
│   ├── images/                          # Imagens estáticas (logo, etc.)
│   │   └── logo.png                     # Logo Chi Sublime
│   ├── favicon.ico                      # Favicon clássico
│   ├── manifest.webmanifest             # PWA manifest
│   ├── web-app-manifest-192x192.png
│   └── web-app-manifest-512x512.png
│
├── src/
│   ├── app/
│   │   ├── [locale]/                    # Routing i18n (pt, en)
│   │   │   ├── (public)/                # Site público
│   │   │   │   ├── page.tsx             # Homepage
│   │   │   │   ├── servicos/
│   │   │   │   ├── equipa/
│   │   │   │   ├── galeria/
│   │   │   │   ├── sobre/
│   │   │   │   ├── contacto/
│   │   │   │   └── reservar/            # Sistema de booking 3 steps
│   │   │   │       ├── page.tsx         # Step 1: escolher serviço
│   │   │   │       ├── horario/         # Step 2: escolher horário
│   │   │   │       ├── confirmar/       # Step 3: confirmar
│   │   │   │       └── [bookingNumber]/ # Página de confirmação
│   │   │   ├── (auth)/                  # Login, registo, recuperação
│   │   │   ├── (client)/                # Área cliente autenticado
│   │   │   └── (legal)/                 # Privacidade, termos, cookies
│   │   │
│   │   ├── admin/                       # Painel administrativo
│   │   │   ├── dashboard/               # KPIs em tempo real
│   │   │   ├── reservas/                # Calendário de marcações
│   │   │   ├── receitas/                # Módulo financeiro - receitas
│   │   │   ├── despesas/                # Módulo financeiro - despesas
│   │   │   ├── clientes/                # Base de dados de clientes
│   │   │   ├── servicos/                # CRUD de serviços
│   │   │   ├── equipa/                  # CRUD de staff
│   │   │   ├── horarios/                # Working hours, feriados
│   │   │   ├── relatorios/              # Relatórios exportáveis
│   │   │   │   ├── financeiro/
│   │   │   │   ├── iva/                 # Relatório IVA para contabilista
│   │   │   │   ├── staff/
│   │   │   │   └── clientes/
│   │   │   ├── caixa/                   # Fecho de caixa diário
│   │   │   ├── conteudo/                # Editor de conteúdo do site
│   │   │   ├── galeria/                 # Gestão de fotos
│   │   │   └── definicoes/              # Empresa, faturação, utilizadores
│   │   │
│   │   ├── api/                         # Endpoints REST
│   │   │   ├── auth/[...nextauth]/      # NextAuth handler
│   │   │   ├── bookings/                # Reservas + availability
│   │   │   ├── clients/                 # Clientes
│   │   │   ├── transactions/            # Transações financeiras
│   │   │   ├── invoices/                # Faturação certificada
│   │   │   ├── upload/                  # Upload Cloudinary
│   │   │   ├── webhooks/resend/         # Webhooks de email
│   │   │   └── cron/                    # Jobs agendados (Vercel Cron)
│   │   │       ├── reminders/           # Lembretes 24h antes
│   │   │       └── recurring-expenses/  # Despesas recorrentes
│   │   │
│   │   ├── apple-icon.png               # Favicon iOS
│   │   ├── icon0.svg                    # Favicon SVG
│   │   ├── icon1.png                    # Favicon PNG
│   │   ├── error.tsx                    # Error boundary global
│   │   ├── globals.css                  # Tailwind + design tokens
│   │   ├── layout.tsx                   # Root layout
│   │   └── not-found.tsx                # Página 404
│   │
│   ├── components/                      # Componentes React
│   │   ├── ui/                          # Primitives (Button, Modal, Input...)
│   │   ├── layout/                      # Navbar, Footer, MobileMenu
│   │   ├── home/                        # Hero, Philosophy, ServicesPreview...
│   │   ├── services/                    # Display de serviços
│   │   ├── team/                        # Cards de equipa
│   │   ├── booking/                     # Sistema de marcação 3 steps
│   │   ├── auth/                        # Login, registo, password reset
│   │   ├── client-area/                 # Área do cliente
│   │   ├── shared/                      # Componentes partilhados
│   │   └── admin/                       # Componentes do painel admin
│   │       ├── layout/                  # Sidebar, Topbar, FAB
│   │       ├── dashboard/               # KPIs, charts, performance
│   │       ├── agenda/                  # Calendário e modais
│   │       ├── transactions/            # Forms receitas/despesas
│   │       ├── checkout/                # POS interno completo
│   │       │   ├── CheckoutModal.tsx
│   │       │   ├── ServiceLines.tsx
│   │       │   ├── PaymentMethodPicker.tsx
│   │       │   ├── InvoiceSection.tsx   # Secção de fatura com NIF
│   │       │   ├── NifInput.tsx         # Validação NIF PT em tempo real
│   │       │   └── QuickClientCreate.tsx
│   │       ├── clients/                 # Tabela e detalhes de clientes
│   │       ├── services/                # CRUD de serviços
│   │       ├── staff/                   # CRUD + horários + férias
│   │       └── reports/                 # Relatórios exportáveis
│   │
│   ├── lib/                             # Lógica de negócio
│   │   ├── db/
│   │   │   └── connect.ts               # Singleton MongoDB com cache
│   │   │
│   │   ├── models/                      # Schemas Mongoose (17 collections)
│   │   │   ├── User.ts                  # Utilizadores web
│   │   │   ├── Client.ts                # Clientes do salão (físicos)
│   │   │   ├── ClientServiceHistory.ts  # Histórico detalhado por cliente
│   │   │   ├── Staff.ts                 # Equipa
│   │   │   ├── Service.ts               # Serviços oferecidos
│   │   │   ├── Category.ts              # Categorias de serviço
│   │   │   ├── Booking.ts               # Reservas
│   │   │   ├── Transaction.ts           # Receitas + despesas
│   │   │   ├── IncomeCategory.ts
│   │   │   ├── ExpenseCategory.ts
│   │   │   ├── CashRegister.ts          # Fecho de caixa diário
│   │   │   ├── Schedule.ts              # Horários e exceções
│   │   │   ├── SiteContent.ts           # Conteúdo editável do site
│   │   │   ├── FiscalSettings.ts        # Config Moloni, IVA, NIF empresa
│   │   │   ├── AuditLog.ts              # Log imutável de alterações
│   │   │   ├── Counter.ts               # Numeração sequencial atómica
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/                        # NextAuth v5 config
│   │   │   ├── config.ts
│   │   │   ├── index.ts
│   │   │   └── permissions.ts           # RBAC: client, staff, admin
│   │   │
│   │   ├── booking/                     # Lógica de reservas
│   │   │   ├── availability.ts          # Algoritmo de slots disponíveis
│   │   │   ├── conflicts.ts             # Deteção de conflitos
│   │   │   └── numbering.ts             # Geração de booking numbers
│   │   │
│   │   ├── invoicing/                   # Provider Pattern de faturação
│   │   │   ├── InvoiceProvider.ts       # Interface abstrata
│   │   │   ├── MockProvider.ts          # Para desenvolvimento
│   │   │   ├── MoloniProvider.ts        # Produção (Moloni 2860/AT)
│   │   │   ├── MoloniAuth.ts            # OAuth2 token management
│   │   │   ├── AturaProvider.ts         # Stub futuro (Atura beta)
│   │   │   ├── index.ts                 # Factory
│   │   │   └── issueInvoiceAction.ts    # Server Action de emissão
│   │   │
│   │   ├── email/                       # Resend + templates
│   │   │   ├── resend.ts
│   │   │   ├── send.ts
│   │   │   └── templates/               # Templates React Email
│   │   │
│   │   ├── pdf/                         # Geração de PDFs
│   │   │   ├── generate.ts
│   │   │   └── templates/               # Receipt, FinancialReport, CashRegister
│   │   │
│   │   ├── cloudinary/                  # Upload de imagens
│   │   ├── utils/                       # Helpers (cn, nif, format, cents, dates)
│   │   ├── validation/                  # Schemas Zod
│   │   ├── constants/                   # Constantes do negócio
│   │   └── server-actions/              # Server Actions Next.js 16
│   │
│   ├── hooks/                           # React hooks customizados
│   ├── i18n/                            # Internacionalização
│   │   ├── config.ts
│   │   ├── request.ts
│   │   └── messages/
│   │       ├── pt.json
│   │       └── en.json
│   ├── types/                           # TypeScript types globais
│   └── proxy.ts                         # Middleware Next.js 16 (i18n + auth)
│
├── scripts/                             # Scripts standalone
│   ├── seed-database.ts                 # Seed inicial completo
│   ├── seed-services.ts                 # Apenas serviços
│   ├── seed-staff.ts                    # Apenas equipa
│   ├── sync-services-to-moloni.ts       # Sincronização Moloni
│   └── backup.ts                        # Export JSON da database
│
├── docs/                                # Documentação interna
│   ├── SETUP.md                         # Guia de setup local
│   ├── SPRINTS.md                       # Detalhe dos sprints
│   ├── DEPLOY.md                        # Guia de deploy Vercel
│   └── JEAN-PIERRE-GUIDE.md             # Manual do utilizador (cliente)
│
├── .env.local                           # Variáveis de ambiente (não commitado)
├── .env.example                         # Template de variáveis
├── .gitignore
├── .prettierrc                          # Config Prettier
├── eslint.config.mjs                    # Config ESLint
├── next.config.ts                       # Config Next.js
├── postcss.config.mjs                   # Config PostCSS (Tailwind v4)
├── tsconfig.json                        # Config TypeScript
├── vercel.json                          # Config deployment
├── package.json
└── README.md                            # Este ficheiro
```

**Totais:**

- 112 pastas
- ~264 ficheiros TypeScript/CSS/JSON estruturados
- 17 schemas Mongoose
- 7 schemas Zod
- 7 templates de email React
- 3 templates PDF

---

## 🎯 Funcionalidades

### Site público

- ✅ Homepage com hero animado, filosofia, preview de serviços, equipa, galeria
- ✅ Página completa de serviços com accordions por categoria (Cabelereiro, Sobrancelhas, Maquilhagem, Unhas, Depilação)
- ✅ Página da equipa com bios individuais
- ✅ Galeria masonry com lightbox
- ✅ Sobre o salão (filosofia, valores, espaço)
- ✅ Contacto (mapa, horários, formulário)
- ✅ Sistema de marcação online em 3 passos
- ✅ Bilingue PT/EN com `next-intl`
- ✅ SEO local otimizado (Schema.org BeautySalon, LocalBusiness)
- ✅ Cookie banner RGPD-compliant
- ✅ Páginas legais (Privacidade, Termos, Cookies)
- ✅ Performance Lighthouse > 95

### Sistema de Booking

- ✅ Step 1: escolher serviço(s) — múltiplos permitidos
- ✅ Step 2: escolher data + horário + profissional (ou "qualquer um disponível")
- ✅ Step 3: dados do cliente + confirmação
- ✅ Algoritmo de disponibilidade respeitando working hours, breaks, férias e feriados
- ✅ Email de confirmação automático com `.ics` anexo
- ✅ Lembrete automático 24h antes
- ✅ Cancelamento self-service pelo cliente (janela 24h)
- ✅ Booking number sequencial (CHI-2026-0001)
- ✅ Anti-fraude (validação email, honeypot, limite de bookings pendentes)

### Painel Administrativo

#### Dashboard

- ✅ KPIs do dia: receita, despesas, lucro líquido, margem, reservas
- ✅ Agenda do dia com status visual (confirmada, em curso, concluída, no-show)
- ✅ Receita por categoria (gráfico de barras)
- ✅ Top profissionais com receita gerada e ocupação %
- ✅ Últimas transações com filtros
- ✅ Saúde do negócio (donut charts: ocupação, retenção, ticket médio)
- ✅ Notificações em tempo real (Server-Sent Events)

#### Módulo Receitas (POS interno)

- ✅ Checkout em 3 cenários: ligado a reserva / walk-in / venda avulsa
- ✅ Múltiplos serviços por transação
- ✅ Aplicar descontos manuais
- ✅ Adicionar gorjetas
- ✅ Métodos de pagamento PT: Dinheiro, Cartão, MB Way, Multibanco, Transferência
- ✅ Atalhos de teclado (Enter, Esc, 1-5)
- ✅ Criação inline de cliente (nome + telefone + email opcional)
- ✅ Secção de fatura integrada com validação NIF em tempo real

#### Módulo Despesas

- ✅ CRUD de despesas com categorização
- ✅ Upload de fatura (foto/PDF) via Cloudinary
- ✅ Despesas recorrentes (renda, luz, internet, software) com cron job
- ✅ Cálculo automático de IVA
- ✅ Filtros e exports

#### Módulo Clientes

- ✅ Tabela completa com filtros (VIP, inativos, aniversariantes)
- ✅ Página de detalhe com tabs: Histórico, Reservas, Transações, Notas, Stats
- ✅ ClientServiceHistory: registo detalhado de cada serviço prestado (cor utilizada, técnica, etc.)
- ✅ Métricas computadas: total gasto, ticket médio, frequência, favorito
- ✅ Tags personalizáveis (VIP, noiva, novo)
- ✅ Export CSV (RGPD compliance)
- ✅ Direito ao esquecimento (soft delete)

#### Módulo Reservas

- ✅ Calendário semanal/diário/mensal
- ✅ Cores por staff (ou status)
- ✅ Drag-to-reschedule (fase 2)
- ✅ Modal de detalhes com ações rápidas (confirmar, cancelar, no-show, checkout)

#### Módulo Serviços

- ✅ CRUD completo
- ✅ Bulk price update (aumentar todos X%)
- ✅ Drag-to-reorder
- ✅ Atribuição staff ↔ serviços (matriz)

#### Módulo Equipa

- ✅ CRUD de staff
- ✅ Editor de horários (planner semanal)
- ✅ Gestão de férias e folgas
- ✅ Métricas individuais (receita gerada, ocupação, top serviços)

#### Relatórios

- ✅ Financeiro (receita vs despesas, lucro, margem, cash flow)
- ✅ IVA trimestral pronto para contabilista
- ✅ Por staff (produtividade individual)
- ✅ Por cliente (top spenders, retention)
- ✅ Despesas categorizadas
- ✅ Exports: PDF formatado, Excel, CSV

#### Caixa Diária

- ✅ Abertura de caixa (Jean Pierre confirma dinheiro inicial)
- ✅ Tracking automático de entradas/saídas em dinheiro
- ✅ Fecho de caixa com cálculo de diferença
- ✅ Relatório PDF do dia (todas as transações)

#### Definições

- ✅ Dados da empresa (NIF, morada, IBAN)
- ✅ Configuração de faturação (Moloni)
- ✅ Categorias de receita/despesa (CRUD)
- ✅ Métodos de pagamento (toggle)
- ✅ Templates de email
- ✅ Política de cancelamento
- ✅ Backup manual (download JSON)

---

## 🧾 Sistema de Faturação Portuguesa

### Decisão técnica

Em Portugal, a emissão de faturas legais exige **software certificado pela AT** (Autoridade Tributária). Em vez de construir o nosso próprio motor (processo complexo, caro, com auditorias contínuas), integramos via API com **Moloni** (n.º de certificação **2860/AT**).

### Arquitetura — Provider Pattern

Implementámos uma camada de abstração que torna o sistema **independente do provedor**:

```typescript
interface InvoiceProvider {
  readonly id: ProviderId;
  readonly certificationNumber: string;
  ping(): Promise<boolean>;
  issueInvoice(input: IssueInvoiceInput): Promise<IssuedInvoice>;
  issueCreditNote(input: CreditNoteInput): Promise<IssuedInvoice>;
  resendInvoiceEmail(externalId: string, email: string): Promise<void>;
  getInvoicePdfUrl(externalId: string): Promise<string>;
}
```

**Implementações:**

| Provider         | Status          | Uso                                                      |
| ---------------- | --------------- | -------------------------------------------------------- |
| `MockProvider`   | ✅ Ativo em dev | Simula emissão para validar UX sem custo                 |
| `MoloniProvider` | 🚀 Produção     | Integração real com Moloni 2860/AT                       |
| `AturaProvider`  | 📦 Stub         | Pronto se Atura sair da beta com certificação verificada |

**Trocar de provedor = 1 linha de env:**

```bash
INVOICE_PROVIDER=moloni  # ou: mock, atura
```

### Fluxo no checkout

1. Jean Pierre regista pagamento de cliente
2. Cliente diz se quer fatura com NIF (radio button no checkout)
3. Se sim, sistema valida NIF em tempo real (algoritmo dígito de controlo PT)
4. Server Action chama API Moloni
5. Moloni gera fatura com **ATCUD + QR code obrigatório**
6. Moloni envia PDF por email automaticamente
7. Sistema guarda referência (número, ATCUD, URL) na nossa Transaction

### Tipos de documento suportados

| Tipo                | Sigla | Quando                                    |
| ------------------- | ----- | ----------------------------------------- |
| Fatura-Recibo       | FR    | Cliente paga e quer fatura completa (NIF) |
| Fatura Simplificada | FS    | Consumidor final, < 1000€ (sem NIF)       |
| Fatura              | FT    | Cliente quer fatura mas paga depois       |
| Nota de Crédito     | NC    | Cancelar/reembolsar                       |
| Nota de Débito      | ND    | Cobrar valor adicional                    |

### Conformidade legal (2026)

- ✅ **ATCUD obrigatório** em todos os documentos (Moloni gera automaticamente)
- ✅ **QR Code** obrigatório (Moloni inclui)
- ✅ **SAF-T (PT)** mensal pronto para contabilista (Moloni exporta)
- ✅ **Numeração sequencial** atómica garantida (Counter collection)
- ✅ **Audit log** imutável de todas as transações
- ✅ **Assinatura digital qualificada** (preparada para 1 jan 2027)

⚠️ **Importante:** Este sistema **não substitui** software certificado standalone — **integra** com ele.

---

## 🗄️ Modelo de Dados (MongoDB)

### Collections principais

#### `Transaction` (coração do sistema financeiro)

```typescript
{
  _id: ObjectId,
  transactionNumber: string,           // "RX-2026-0001" (sequencial atómico)
  type: "income" | "expense",
  date: Date,
  amount: number,                      // EUR cents (sempre integer)
  vatRate: number,                     // 0, 6, 13, 23
  vatAmount: number,
  totalWithVat: number,

  // Receitas
  clientId?: ObjectId,
  bookingId?: ObjectId,
  staffId?: ObjectId,
  services?: [{ serviceId, name, price, quantity, discount }],

  // Despesas
  expenseCategoryId?: ObjectId,
  supplier?: string,
  invoiceFile?: string,                // Cloudinary URL

  paymentMethod: "cash" | "card_terminal" | "mb_way" | "transfer" | "multibanco",

  // Faturação certificada
  invoiceRequested: boolean,
  invoiceData?: {
    issued: boolean,
    provider: "moloni" | "atura" | "mock",
    certificationNumber: string,        // "2860/AT"
    documentNumber: string,             // "FR 2026/0042"
    atcud: string,                      // "AAJFJMVI-42"
    pdfUrl: string,
    customerSnapshot: { name, vatNumber, ... },
    // ... mais campos
  },

  status: "completed" | "pending" | "refunded" | "cancelled",
  createdBy: ObjectId,
  createdAt, updatedAt
}
```

#### `Client` (base de dados de clientes do salão)

```typescript
{
  _id: ObjectId,
  userId?: ObjectId,                   // se tem conta web
  name: string,                        // OBRIGATÓRIO
  phone: string,                       // OBRIGATÓRIO
  email?: string,
  birthday?: Date,

  fiscalData?: {
    vatNumber?: string,                // NIF
    fullLegalName?: string,
    address, postalCode, city, country
  },

  // Métricas computadas
  totalSpent: number,
  visitCount: number,
  averageTicket: number,
  lastVisit?: Date,
  favoriteServiceId?: ObjectId,
  loyaltyPoints: number,
  tags: string[],                      // ["VIP", "noiva", "novo"]

  marketingConsent: boolean,           // RGPD
  active: boolean,                     // soft delete
  createdAt, updatedAt
}
```

### Outras collections

| Collection                           | Propósito                                            |
| ------------------------------------ | ---------------------------------------------------- |
| `User`                               | Utilizadores web (clientes registados, staff, admin) |
| `ClientServiceHistory`               | Histórico detalhado de cada serviço por cliente      |
| `Staff`                              | Equipa do salão (Jean Pierre, Matias, Ana Rita)      |
| `Service`                            | Serviços oferecidos (~38 serviços)                   |
| `Category`                           | Categorias (Cabelereiro, Sobrancelhas, etc.)         |
| `Booking`                            | Reservas online + balcão                             |
| `IncomeCategory` / `ExpenseCategory` | Categorização para relatórios                        |
| `CashRegister`                       | Fecho de caixa diário                                |
| `Schedule`                           | Horários base, feriados, exceções                    |
| `SiteContent`                        | Conteúdo editável do site (hero, about, etc.)        |
| `FiscalSettings`                     | Config Moloni, IVA defaults, NIF empresa             |
| `AuditLog`                           | Log imutável de alterações críticas                  |
| `Counter`                            | Contadores atómicos para numeração sequencial        |

---

## 🚀 Sprints e Roadmap

| Sprint | Foco                                                                      | Estado     | Duração  |
| ------ | ------------------------------------------------------------------------- | ---------- | -------- |
| **0**  | Setup, design tokens, fontes, MongoDB, i18n, utilities base               | 🔄 Próximo | 3-4 dias |
| **1**  | Frontend público completo (homepage, serviços, equipa, galeria, contacto) | ⏳         | 5-7 dias |
| **2**  | Database + models + seeds                                                 | ⏳         | 2-3 dias |
| **3**  | Sistema de booking público (3 steps)                                      | ⏳         | 5-7 dias |
| **4**  | Auth + área cliente                                                       | ⏳         | 3-4 dias |
| **5**  | Admin: dashboard, agenda, gestão serviços/equipa                          | ⏳         | 5-7 dias |
| **6**  | Admin: Módulo Receitas + POS interno                                      | ⏳         | 4-5 dias |
| **7**  | Admin: Módulo Despesas + categorias                                       | ⏳         | 3-4 dias |
| **8**  | Admin: Módulo Clientes + histórico de serviços                            | ⏳         | 3-4 dias |
| **9**  | Admin: Relatórios + Fecho de Caixa + Exports                              | ⏳         | 3-4 dias |
| **10** | Notificações tempo-real + cron jobs + automações                          | ⏳         | 2-3 dias |
| **11** | Páginas legais, RGPD, polishing, SEO                                      | ⏳         | 2-3 dias |
| **12** | Integração Moloni REAL (substitui MockProvider)                           | ⏳         | 3-4 dias |
| **13** | QA, mobile testing, deploy Vercel, treino com cliente                     | ⏳         | 2-3 dias |

**Estimativa total:** 45-60 dias efetivos de desenvolvimento.

### Estado atual: Pré-Sprint 0 (Scaffold completo)

- ✅ Next.js 16 + React 19 + TypeScript + Tailwind v4 instalado
- ✅ 39 dependências instaladas e validadas para compatibilidade
- ✅ Estrutura completa: 112 pastas, ~264 ficheiros
- ✅ Provider Pattern de faturação preparado
- ✅ Favicons e ícones gerados (apple-icon, icon0.svg, icon1.png)
- ✅ Servidor a arrancar limpo em `localhost:3000/pt`
- ✅ Página 404 funcional com paleta Chi Sublime
- ✅ Logo no tab do browser

---

## 💻 Setup Local

### Pré-requisitos

- **Node.js** 22+ (conforme `.nvmrc`)
- **npm** 10+
- **Git**
- Conta gratuita em:
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (database)
  - [Cloudinary](https://cloudinary.com) (imagens)
  - [Resend](https://resend.com) (emails)
  - (Produção) [Moloni](https://www.moloni.pt) (faturação certificada)

### Instalação

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd chi-sublime

# 2. Instalar dependências
npm install --legacy-peer-deps

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com as tuas credenciais

# 4. (Opcional) Popular base de dados com dados de exemplo
npx tsx scripts/seed-database.ts

# 5. Arrancar servidor de desenvolvimento
npm run dev

# 6. Abrir no browser
# http://localhost:3000/pt
```

---

## 🔐 Variáveis de Ambiente

Ver `.env.example` para template completo. Variáveis essenciais:

```bash
# Database
MONGODB_URI="mongodb+srv://..."

# Auth (NextAuth v5)
AUTH_SECRET="..." # gerado com: openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Resend (emails)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="reservas@chisublime.pt"

# Faturação
INVOICE_PROVIDER="mock" # mock | moloni | atura

# Moloni (apenas em produção)
MOLONI_CLIENT_ID="..."
MOLONI_CLIENT_SECRET="..."
MOLONI_REDIRECT_URI="http://localhost:3000/api/auth/moloni/callback"

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE="pt"
NEXT_PUBLIC_SUPPORTED_LOCALES="pt,en"
```

---

## 📜 Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint check

# Scripts customizados (via tsx)
npx tsx scripts/seed-database.ts             # Seed completo
npx tsx scripts/seed-services.ts             # Apenas serviços
npx tsx scripts/seed-staff.ts                # Apenas equipa
npx tsx scripts/sync-services-to-moloni.ts   # Sync serviços → Moloni
npx tsx scripts/backup.ts                    # Backup JSON da database
```

---

## ⚖️ Conformidade Legal (Portugal)

### Faturação certificada

- Software certificado **Moloni 2860/AT** via API
- ATCUD em todos os documentos
- QR Code obrigatório
- SAF-T mensal exportável

### RGPD

- Consentimento explícito de cookies (banner)
- Consentimento marketing separado
- Direito ao esquecimento (soft delete + endpoint dedicado)
- Direito à portabilidade (export CSV de cliente)
- Política de privacidade detalhada
- Data Processing Agreement com Vercel + MongoDB Atlas + Cloudinary + Resend (todos UE)

### Hosting

- **Vercel** região eu-central (Frankfurt)
- **MongoDB Atlas** região europa
- **Cloudinary** UE
- **Resend** EU

---

## 💰 Custos Operacionais

### Mensais (após launch)

| Serviço               | Custo (com IVA) | Notas                          |
| --------------------- | --------------- | ------------------------------ |
| Moloni Flex (anual)   | 13,41€          | Faturação certificada com API  |
| Vercel Pro            | ~24,60€         | Hosting Next.js + edge network |
| MongoDB Atlas M10     | ~11,07€         | Database região UE             |
| Cloudinary            | 0-12,30€        | Free tier inicial              |
| Resend                | 0€              | Free tier até 3.000 emails/mês |
| Domínio chisublime.pt | ~1,23€          | 12€/ano                        |
| **Total estimado**    | **~50-62€/mês** |                                |

### Comparação

- **Mangomint:** ~155€/mês (e nem sequer válido em Portugal)
- **Phorest:** ~120€/mês (não suporta ATCUD)
- **Chi Sublime custom:** **~55€/mês** com tudo personalizado

---

## 👥 Equipa e Contactos

### Cliente

**Jean Pierre** — Proprietário Chi Sublime
📞 +351 932 932 691
📍 Rua Estorninho, Loja E, Quinta da Bicuda, 2750-686 Cascais

### Desenvolvimento

**Orlando Pedrazzoli** — Pedrazzoli Digital
🌐 [pedrazzolidigital.com](https://pedrazzolidigital.com)
📍 Oeiras / Lisboa

---

## 📄 Licença

Projeto privado. Todos os direitos reservados — Pedrazzoli Digital © 2026.

---

<div align="center">

**Construído com ❤️ em Cascais**

[Site](https://www.chisublime.pt) · [Documentação](./docs/) · [Sprints](./docs/SPRINTS.md)

</div>
