# Keepit Carnaval 2026

Sistema de experiencia e engajamento para o Carnaval 2026 no Anhembi (Sao Paulo). O sistema captura fotos dos participantes, exibe em teloes LED e coleta leads qualificados para a marca Keepit.

## Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React
- **Animations:** Framer Motion

## Pre-requisitos

- Node.js 18.17 ou superior
- pnpm 8.x ou superior
- Conta no Supabase (projeto ja configurado)
- Conta no Vercel (para deploy)

## Instalacao

1. Clone o repositorio:

```bash
git clone https://github.com/caiorodrigo10/keepit-carnaval-2026.git
cd keepit-carnaval-2026
```

2. Instale as dependencias:

```bash
pnpm install
```

3. Configure as variaveis de ambiente:

```bash
cp .env.example .env.local
```

Edite o `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-projeto
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

4. Inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

O projeto estara disponivel em [http://localhost:3000](http://localhost:3000).

## Scripts Disponiveis

| Comando | Descricao |
|---------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento com Turbopack |
| `pnpm build` | Cria a build de producao |
| `pnpm start` | Inicia o servidor de producao |
| `pnpm lint` | Executa o ESLint |

## Estrutura do Projeto

```
keepit-carnaval-sistema/
├── app/
│   ├── (public)/          # Landing page publica (Gate + Hub)
│   ├── fotografo/         # Portal do fotografo
│   ├── moderacao/         # Central de moderacao
│   ├── telao/             # Display dos teloes LED
│   ├── admin/             # Dashboard administrativo
│   ├── api/               # API Routes
│   ├── layout.tsx         # Layout raiz
│   ├── page.tsx           # Pagina inicial
│   └── globals.css        # Estilos globais
├── components/
│   └── ui/                # Componentes shadcn/ui
├── lib/
│   ├── supabase/          # Clientes Supabase
│   │   ├── client.ts      # Cliente para browser
│   │   ├── server.ts      # Cliente para server-side
│   │   └── middleware.ts  # Helper para middleware
│   └── utils.ts           # Utilitarios (cn)
├── types/
│   └── database.ts        # Types do banco de dados
├── hooks/                 # Custom hooks
├── middleware.ts          # Middleware Next.js
├── .env.example           # Template de variaveis
└── .env.local             # Variaveis de ambiente (git ignored)
```

## Modulos do Sistema

### 1. Portal do Fotografo (`/fotografo`)
- Upload de fotos em lote
- Fotos vao direto para fila do telao (auto-aprovadas)
- Tracking de conversoes

### 2. Central de Moderacao (`/moderacao`)
- Fila de aprovacao de fotos
- Acoes: Aprovar / Rejeitar / Bloquear usuario
- SLA: 5 minutos em horario de pico

### 3. Controle do Telao (`/telao`)
- Gerenciamento da fila de fotos em tempo real
- Sincronizacao entre teloes Henco + Keepit + Renko
- Proporcao: 70% fotos de fotografos, 30% fotos de usuarios
- Tempo de exibicao: 5 segundos por foto

### 4. Landing Page (`/`)
- **Gate:** Preview dos recursos + formulario de cadastro
- **Hub:** Acesso completo apos cadastro (mural, mapa, programacao, sorteios)

### 5. Admin Dashboard (`/admin`)
- Metricas e analytics do evento
- Export de leads (CSV/Excel)
- Relatorio pos-evento automatizado

## Supabase

O projeto utiliza o Supabase como backend. O projeto ja esta configurado com:

- **Project ID:** `kkwiytwlbikdbctuurtr`
- **Region:** us-east-1
- **URL:** https://kkwiytwlbikdbctuurtr.supabase.co

### Regenerar tipos do banco

```bash
pnpm dlx supabase gen types typescript --project-id kkwiytwlbikdbctuurtr > types/database.ts
```

## Design System

O projeto segue o Design System Keepit Eventos com as seguintes cores principais:

| Token | Cor | Uso |
|-------|-----|-----|
| `keepit-neon` | `#66FB95` | CTAs primarios, destaques |
| `keepit-brand` | `#34BF58` | Cor da marca |
| `keepit-secondary` | `#67FB94` | Botoes secundarios |
| `keepit-dark` | `#1E1E1E` | Background escuro |

### Temas
- **Landing/Gate:** Dark theme (fundo preto, texto branco, verde neon)
- **Admin:** Light theme

## Deploy

O projeto esta configurado para deploy automatico no Vercel via GitHub.

### Variaveis de Ambiente no Vercel

Configure as seguintes variaveis no dashboard do Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (URL do deploy)

## Timeline

- **Deadline desenvolvimento:** 06 de Fevereiro de 2026
- **Evento:** 13, 14 e 15 de Fevereiro de 2026

## Licenca

Projeto privado - Keepit / Digibrands Global
