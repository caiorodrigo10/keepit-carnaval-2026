# Keepit Carnaval 2.0 — Especificacao

**Data:** 2026-02-14
**Status:** Em andamento
**Branch:** v2
**Deadline:** 14/02/2026 (hoje)

---

## 1. Contexto e Motivacao

A v1.0 foi lancada para os primeiros dias do evento (13-14 fev) e apresentou problemas criticos na funcionalidade de IA com fotos:

- **Resultado ruim:** O rosto da pessoa nao aparecia corretamente na imagem final
- **Inconsistencia:** A IA gerava resultados muito diferentes do esperado
- **Causa raiz:** As fotos de template (modelos posando) nao eram adequadas para face-swap

**Decisao:** Simplificar a IA e adicionar novas experiencias de engajamento.

---

## 2. Features da v2.0

### 2.1 Foto IA — Troca de Roupa ✅ IMPLEMENTADO

**Status:** Concluido e testado localmente.

**O que mudou:**
- Eliminado conceito de templates/modelos
- **1 foto apenas** (era ate 5)
- Wizard de 3 steps: Upload → Gerando → Resultado (era 4)
- Prompt focado em troca de roupa (nao mais face-swap)
- Limite de 3 geracoes por lead (desativado em dev)
- Watermark mantido
- Aspect ratio: mantém proporcao original da foto

**Arquivos modificados:**
- `types/ai-photo.ts` — `GenerateRequest` com `photo_url` unico
- `types/database.ts` — `template_id` agora nullable
- `lib/ai-photo/validations.ts` — validacao para 1 foto
- `lib/ai-photo/generate.ts` — novo prompt, sem template, sem Gemini pre-analysis
- `lib/ai-photo/kie-client.ts` — interface simplificada (`imageUrls`)
- `lib/ai-photo/index.ts` — barrel export atualizado
- `lib/ai-photo/storage.ts` — cache-buster na URL
- `app/api/ai-photo/generate/route.ts` — API sem template_id
- `app/api/dados/route.ts` — fix template_id nullable
- `components/ai-photo/wizard-stepper.tsx` — 3 steps
- `components/ai-photo/photo-uploader.tsx` — UI para 1 foto
- `components/ai-photo/result-gallery.tsx` — sem referencia a template
- `app/hub/ai-photo/content.tsx` — wizard reescrito

**Migration aplicada:**
- `make_template_id_nullable` — `ALTER TABLE ai_photo_generations ALTER COLUMN template_id DROP NOT NULL`

---

### 2.2 Roleta de Premios 🔄 PROXIMO

**Rota:** `/roleta`
**Acesso:** Apenas via link direto (equipe no stand)

**Fluxo do usuario:**
1. Acessa `/roleta` pelo link
2. Preenche formulario: nome, email, telefone
3. Aceita LGPD
4. Gira a roleta animada
5. Todos ganham — nao existe "nao premiado"
6. Exibe premio na tela
7. Equipe no stand entrega o brinde

**Regras:**
- 1 giro por pessoa (validado por email/telefone)
- Sorteio server-side (anti-manipulacao)
- Probabilidades configuraveis
- Sem cupom — equipe ve o resultado na tela

**Premios (exemplo — aguardando reais):**

| # | Premio | Slug | Probabilidade |
|---|--------|------|---------------|
| 1 | Chaveiro Keepit | `chaveiro` | 35% |
| 2 | Adesivo Keepit | `adesivo` | 30% |
| 3 | Copo Personalizado | `copo` | 20% |
| 4 | Desconto 20% Keepit | `desconto-20` | 10% |
| 5 | Ecobag Keepit | `ecobag` | 5% |

---

### 2.3 Pesquisa de Satisfacao ⏳ PENDENTE

**Rota:** `/pesquisa`
**Status:** Aguardando conclusao da roleta.

---

## 3. Arquitetura de Dados

### 3.1 Tabelas Novas

#### `prize_wheel_spins`
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK, default gen_random_uuid() |
| lead_id | uuid | FK → leads, NOT NULL |
| prize_slug | text | Identificador do premio, NOT NULL |
| prize_name | text | Nome exibido ao usuario |
| created_at | timestamptz | default now() |

#### `survey_responses` (para pesquisa)
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK, default gen_random_uuid() |
| lead_id | uuid | FK → leads, NOT NULL, UNIQUE |
| answers | jsonb | `[{question_id, question, answer}]` |
| completed | boolean | Se respondeu tudo |
| prize_slug | text | Brinde recebido (nullable) |
| created_at | timestamptz | default now() |

### 3.2 Migrations necessarias (roleta)

1. Adicionar `'roleta'` e `'pesquisa'` ao enum `lead_origin`
2. Criar tabela `prize_wheel_spins`
3. RLS: anon INSERT, service_role SELECT

### 3.3 Tabelas Existentes

- **`leads`**: Sem mudanca estrutural. Roleta cria leads com `origin = 'roleta'`
- **`lead_origin` enum**: Atualmente `{qr_code, spontaneous, traffic}` → precisa adicionar `roleta`, `pesquisa`

---

## 4. Decisoes Pendentes

- [ ] **Premios reais da roleta** — usando exemplos por enquanto
- [ ] **Brinde da pesquisa** — qual e?
- [ ] **Perguntas da pesquisa** — confirmar as 5 perguntas exatas
- [x] ~~Prompt de IA~~ — implementado e testado

---

## 5. Stack Tecnica (sem mudanca)

- Next.js 14+ (App Router), Supabase, Tailwind CSS, shadcn/ui
- Framer Motion (animacoes roleta), Kie.ai NanoBanana Pro
- Vercel, pnpm
