# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Supabase MCP

**Project ID:** `kkwiytwlbikdbctuurtr`
**Project Name:** Keepit Carnaval 2026
**Region:** us-east-1
**Database Host:** db.kkwiytwlbikdbctuurtr.supabase.co
**API URL:** https://kkwiytwlbikdbctuurtr.supabase.co
**Organization:** Digibrands Global

> **Nota:** As chaves de API (anon key e publishable key) estão disponíveis via Supabase MCP usando `get_publishable_keys`.

## Roobin MCP

**Project ID:** `6ae1dc32-01c1-4100-8c8c-d2519ac5f95d`

### Documents
| Document | ID | Version |
|----------|-----|---------|
| Project Brief | `b468b1ac-8945-4a1c-999a-f70a87203bae` | v1.3 |
| PRD | `6d248ccb-e07c-4a47-bafd-29a6326c6729` | v1.3 |
| Arquitetura | `0844624b-b923-41bf-bb42-bc952e8f8824` | v1.1 |
| Design System | `9afc6eff-cc1e-4072-8ac1-98147cf2a90c` | v1.0 |

## Project Overview

Keepit Carnaval Sistema is an event experience and engagement system for Carnival 2026 at Anhembi (São Paulo). The system captures participant photos, displays them on LED screens, and collects qualified leads for the Keepit brand (intelligent locker storage service).

**Current Status:** Architecture phase - ready for development.

**Timeline:**
- Deadline: 06 de fevereiro de 2026 (4 dias)
- Evento: 17 e 18 de fevereiro de 2026

**Stack:** Next.js 14+ (App Router), Supabase, Vercel, Tailwind CSS

## Design System

Baseado no **Keepit Eventos** (GitHub: caiorodrigo10/keepit-eventos) + cores do globalkeepit.com

### UI Stack
- **Components:** shadcn/ui (style: new-york)
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Fonts:** Montserrat, Titillium Web, Inter

### Cores Principais
| Token | Cor | Uso |
|-------|-----|-----|
| `keepit-neon` | `#66FB95` | Primary CTA, destaques |
| `keepit-brand` | `#34BF58` | Brand color |
| `keepit-secondary` | `#67FB94` | Botões secundários |
| `keepit-dark` | `#1E1E1E` | Background dark |

### Tema
- **Landing/Gate:** Dark theme (fundo preto, texto branco, verde neon)
- **Admin:** Light theme (Donezo Design System)

## System Architecture

The system consists of five main modules:

### 1. Photographer Portal
- Photo upload interface (batch uploads)
- Photos go directly to mural and screen queue (auto-approved)
- Conversion tracking
- Photographers bypass moderation queue

**NOTA:** QR Code da pulseira é GENÉRICO (mesmo QR para todos). Não há tracking foto↔participante.

### 2. Moderation Center
- Photo approval queue with preview
- Actions: Approve / Reject / Block user
- SLA target: 5-minute approval during peak hours
- Filters by origin, date, status

### 3. LED Screen Control Center
- Real-time photo queue management
- Sync between Henco + Keepit + Renko screens
- Display ratio: 70% photographer photos, 30% user photos
- Display time: 5 seconds per photo

### 4. Public Landing Page (GATE → HUB)
Entry points: QR code bracelet (generic), LED screen QR, paid traffic ads

**FLUXO GATE:** Cadastro obrigatório ANTES de acessar conteúdos.

1. **Gate (/):** Preview dos recursos (blur) + Formulário de cadastro (nome, telefone, email)
2. **Hub (após cadastro):** Acesso completo a todos os recursos

Contents (após cadastro):
- Photo gallery/mural with download/share
- Interactive Anhembi map (stages, restrooms, food court, Keepit area)
- Parade schedule with alerts
- Raffle participation status
- Keepit franchise information + CTA
- Upload de foto espontânea

### 5. Admin Dashboard
- Event metrics and analytics
- Lead export (CSV/Excel)
- Automated post-event report

## Key Business Rules

| Rule | Specification |
|------|---------------|
| Photographer photos | Auto-approved, priority display queue |
| User-submitted photos | Must pass moderation |
| Screen display time | 5 seconds per photo |
| Screen ratio | 70% photographer / 30% user photos |
| Raffle participation | Automatic upon photo capture |
| Prize claim period | 24h after announcement |

## Data Model

### Leads (independente de photos)
Required fields: name, phone (with DDD), email, franchise_interest (boolean), lgpd_consent, origin, created_at

### Photos
Fields: file_url, thumbnail_url, status (pending/approved/rejected), source (photographer/user), photographer_id (nullable)

## Performance Requirements

- Landing page load: <2 seconds
- Photo upload: <5 seconds on 4G
- QR scan to photo view: <10 seconds
- Lead form completion: <2 minutes
- Moderation queue: <5 minutes SLA

## Integration Points

- **Renko Partnership:** LED screen integration pending negotiation (quantity, positioning, transmission protocol TBD)
- **Notifications:** SMS/WhatsApp for raffle results
- **LGPD Compliance:** Required for all data collection
