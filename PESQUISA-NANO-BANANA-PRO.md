# Pesquisa: Nano Banana Pro — Prompt Engineering para Fidelidade de Face Swap

> Pesquisa realizada em Fev/2026 com base em documentacao oficial do Gemini, Kie.ai, e recursos da comunidade.

---

## BACKUP — Prompt V5 (full_character_reference)

```
{refRange} {is a/are} full character reference — use {it/them} to reproduce this person's COMPLETE appearance: face, body, skin color, gender, age, build, and all physical traits. Do NOT perform face swap or paste a face onto another body. Generate the entire person from scratch as a single coherent individual. Image {lastIdx} is a costume and setting reference ONLY. Use it for the outfit design, accessories, and background environment. Completely disregard the person shown in image {lastIdx} — their body, skin, and features must NOT appear in the output. Create a brand new photorealistic photograph of the person from the character reference, wearing a carnival costume similar to the one in image {lastIdx}, in a similar festive setting. The person's skin color must be uniform across their entire body — face, neck, arms, hands, legs, and chest must all be the exact same tone. Derive the skin color from the character reference only. Match the person's gender and body type to the character reference: feminine body for women, masculine body for men. Arm thickness, proportions, and body hair must correspond to the referenced person, not the costume template. Preserve 100% of facial features: face shape, eye color, skin tone, and all distinctive marks. Do NOT beautify or alter the face. Photorealistic 8K quality, 85mm portrait lens at f/1.8, three-point lighting, high dynamic range. Natural skin texture with visible pores. The result must look like a real photograph of this specific person at a carnival event.
```

---

## 1. Analise da Arquitetura Atual

### Como funciona hoje

**Arquivo:** `lib/ai-photo/generate.ts` (linhas 97-111)

```typescript
// Monta array: [ref1, ref2, ref3, templateImage]
const selectedRefs = referencePhotos.slice(0, 3);
const refCount = selectedRefs.length;
const lastIdx = refCount + 1;

const prompt = [
  `Generate a professional, photorealistic photograph of the person shown in ${refCount === 1 ? "image 1" : `images 1-${refCount}`}.`,
  `The person must be placed into the scene, pose, outfit, and setting from image ${lastIdx}.`,
  `This must look like a real photo taken of this specific person — not a composite or collage.`,
  `The entire body, skin tone, and complexion must be consistent and naturally belong to the same person from the reference photos.`,
  `Match the lighting, shadows, and color grading of image ${lastIdx} so everything blends seamlessly.`,
  `The final image should be indistinguishable from a real photograph.`,
].join(" ");
```

**Arquivo:** `lib/ai-photo/kie-client.ts` (linhas 77-80)

```typescript
const imageInput = [
  ...input.referencePhotoUrls,     // face source FIRST
  resolvePublicUrl(input.templateImageUrl),  // template LAST
];
```

### Pontos Fortes do Prompt Atual
- Ordem de imagens correta (face primeiro, template por ultimo)
- Abordagem "output-first" (descreve o resultado, nao o processo)
- Menciona consistencia de skin tone
- Referencia as imagens por indice ("image 1", "image N")

### Gaps Identificados

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Sem especificacoes tecnicas de camera/lens | Resultados menos fotorrealistas | Alta |
| Sem instrucoes de iluminacao especifica | Blending inconsistente | Alta |
| Sem micro-constraints de preservacao facial | Face pode "driftar" do original | Alta |
| Sem instrucoes de textura de pele | Pele pode parecer artificial/airbrushed | Media |
| Sem negative constraints ("do NOT...") | Modelo tem liberdade demais | Media |
| Usa ate 3 fotos de referencia (poderia usar mais) | Menos dados de face = menos fidelidade | Media |
| Resolucao hardcoded "1K" | Qualidade abaixo do possivel | Baixa |
| Campo `prompt` no DB e dead code | Confusao, nao afeta resultado | Baixa |

---

## 2. Melhores Praticas Pesquisadas

### 2.1 Ordem de Imagens (JA FAZEMOS CORRETO)

A ordem no array `image_input` e crucial:
- **Face source PRIMEIRO** (imagens 1-N)
- **Template/body ULTIMO** (imagem N+1)

> "Always upload face FIRST, body SECOND, reference in prompt as 'image one' and 'image two'"

### 2.2 Narrativa vs Keywords

**ERRADO:**
```
"woman, beautiful, portrait, professional, high quality"
```

**CORRETO:**
```
"A professional portrait of a confident woman in her late 20s,
shot in a modern studio with three-point lighting. The 85mm lens
creates a shallow depth of field..."
```

O modelo responde muito melhor a prompts narrativos/descritivos do que a listas de keywords.

### 2.3 Especificacoes Tecnicas de Camera

Referenciar equipamentos especificos ativa algoritmos de renderizacao fotorrealistica mais eficazes que pedidos genericos como "high quality":

```
"Sony A7III with 85mm f/1.4 lens"
"Shot at f/1.8, shallow depth of field, catchlight in eyes"
"Kodak Portra 400 film aesthetic"
```

### 2.4 Arquitetura de Iluminacao

Especificar setup de iluminacao melhora drasticamente o blending entre face e cena:

```
"Three-point lighting setup:
- Soft natural fill light from front
- Strong golden rim light from back-right
- Subtle rim light separating shoulders from background"
```

### 2.5 Micro-Constraints de Preservacao Facial

Instrucoes explicitas sobre o que PRESERVAR e o que NAO ALTERAR:

```
"Must preserve from reference image:
- Exact facial features and structure
- Eye color and shape
- Skin tone and natural texture with visible pores
- Natural expression

Must NOT change:
- Identity or facial geometry
- Hairline and hair color
- Skin marks and freckles"
```

### 2.6 Textura de Pele Natural

**EVITAR:**
```
"smooth skin", "perfect skin", "airbrushed look"
```

**USAR:**
```
"Natural skin texture with visible pores and subtle imperfections"
"Photorealistic 8k skin rendering with micro-details"
"Lifelike skin texture, micro-details of hair, pores, reflections"
```

### 2.7 Prevencao de Artefatos de Colagem

Para evitar o efeito "paste/collage":

```
"Seamless blend at hairline with natural hair strands, no hard edges"
"Natural moisture on skin, visible pores, subtle variations in tone"
```

### 2.8 Capacidade Multi-Imagem

O modelo suporta ate **14 imagens de referencia**:
- Ate **6 imagens** para objetos (alta fidelidade)
- Ate **5 imagens** para humanos (consistencia de personagem)

**Sistema de pesos:**
- Identity: 1.0 (face — MAIOR prioridade)
- Layout: 0.7 (composicao da cena)
- Style: 0.5 (estetica — MENOR para nao dominar)

> Atualmente usamos apenas 3 fotos. Subir para 4-5 pode melhorar a fidelidade.

### 2.9 Resolucao

| Resolucao | Uso |
|-----------|-----|
| 1K | Testes rapidos, iteracao de prompt |
| **2K** | **Melhor custo-beneficio (recomendado)** |
| 4K | Print, displays grandes |

> Atualmente usamos 1K. Subir para 2K e uma melhoria facil.

### 2.10 JSON Structured Prompting

Formato JSON pode ser **40% mais rapido** e previne bleeding entre subjects:

```json
{
  "subject": {
    "identity": "Keep the face 100% accurate from reference image",
    "constraints": "do not alter facial structure or features"
  },
  "photography": {
    "camera": "Sony A7III with 85mm f/1.4 lens",
    "lighting": "soft natural fill light + strong golden rim light",
    "style": "photorealistic 8k portrait"
  },
  "constraints": {
    "must_preserve": ["facial features", "eye color", "skin tone"],
    "must_not_change": ["identity", "facial structure"]
  }
}
```

> Nota: Testar se a API do Kie.ai aceita JSON no campo prompt antes de implementar.

---

## 3. Prompt Proposto (V2)

### Versao Texto (compatibilidade garantida)

```typescript
const prompt = [
  // 1. Goal/Action
  `Generate a professional, photorealistic photograph of the person shown in ${refRange}.`,

  // 2. Scene placement
  `Place this person naturally into the exact scene, pose, outfit, and setting from image ${lastIdx}.`,

  // 3. Identity preservation (micro-constraints)
  `Preserve 100% of the facial features from the reference: exact face shape, eye color, skin tone, facial structure, and all distinctive marks.`,
  `Do NOT alter, smooth, or beautify the face in any way.`,

  // 4. Skin texture
  `Render natural skin texture with visible pores and subtle imperfections — not airbrushed or plastic.`,

  // 5. Blending
  `Seamlessly blend the person into the scene: match lighting direction, shadow intensity, and color temperature from image ${lastIdx}.`,
  `Natural hair strands blending into the background with no hard edges or cut-out artifacts.`,

  // 6. Technical specs
  `Shot with 85mm portrait lens at f/1.8, shallow depth of field.`,
  `Professional three-point lighting: soft fill from front, rim light separating subject from background.`,
  `High dynamic range, calibrated color grading, 8K photorealistic quality.`,

  // 7. Final constraint
  `The result must be indistinguishable from a real photograph — no composite, collage, or paste artifacts.`,
].join(" ");
```

### Diferencas vs Prompt Atual

| Aspecto | V1 (Atual) | V2 (Proposto) |
|---------|-----------|---------------|
| Linhas de prompt | 6 | 11 |
| Camera/lens specs | Nenhuma | 85mm f/1.8 |
| Iluminacao | "Match lighting" (vago) | Three-point setup especifico |
| Preservacao facial | Nenhuma explicita | 5 atributos listados |
| Negative constraints | Nenhuma | "Do NOT alter/smooth/beautify" |
| Textura de pele | Nenhuma | "visible pores, not airbrushed" |
| Anti-artefato | "not a composite" | "no hard edges, natural hair strands" |
| Resolucao no prompt | Nenhuma | "8K photorealistic" |

---

## 4. Outras Melhorias de Implementacao

### 4.1 Aumentar fotos de referencia (3 → 5)

```typescript
// generate.ts linha 98
// ANTES:
const selectedRefs = referencePhotos.slice(0, 3);

// DEPOIS:
const selectedRefs = referencePhotos.slice(0, 5);
```

Mais fotos = mais dados faciais = melhor fidelidade. O modelo suporta ate 5 para humanos.

### 4.2 Subir resolucao para 2K

```typescript
// generate.ts linha 126
// ANTES:
resolution: template.resolution || "1K",

// DEPOIS:
resolution: template.resolution || "2K",
```

Melhor qualidade sem custo significativo adicional.

### 4.3 Limpar dead code do prompt no DB

O campo `prompt` na tabela `ai_photo_templates` nunca e lido pelo `generate.ts`. Opcoes:
- **Opcao A:** Remover o campo do DB (breaking change se alguem usar)
- **Opcao B (recomendada):** Manter mas documentar que e dead code, considerar uso futuro para prompts per-template

### 4.4 Imagens de referencia otimas

Orientar o usuario a enviar fotos com:
- Rosto visivel e bem iluminado
- **Diferentes angulos** (frente, 45°, perfil) — melhora drasticamente a consistencia
- Sem oculos escuros ou mascaras
- Resolucao minima 1024x1024px

---

## 5. Estrategia de Cadeia de Edicoes (Avancado)

Para transformacoes complexas, quebrar em passos sequenciais melhora a qualidade:

```
Step 1: Face swap only
  "Insert face from image 1, preserve exact lighting and background"

Step 2: Outfit/scene adjustment
  "Adapt clothing and pose to match carnival theme, maintain face"

Step 3: Color grading
  "Apply warm color grading matching scene, preserve all previous edits"
```

> Nota: Isto requer multiplas chamadas a API (maior custo e tempo). Considerar como feature futura premium.

---

## 6. Resumo de Acoes Priorizadas

| # | Acao | Esforco | Impacto |
|---|------|---------|---------|
| 1 | Atualizar prompt para V2 | 15 min | Alto |
| 2 | Subir resolucao 1K → 2K | 1 min | Medio-Alto |
| 3 | Aumentar refs 3 → 5 | 1 min | Medio |
| 4 | Melhorar orientacoes de foto na UI | 30 min | Medio |
| 5 | Testar JSON structured prompt | 1h | Medio (se funcionar) |
| 6 | Cadeia de edicoes (multi-step) | 4h+ | Alto (futuro) |

---

## 7. Fontes Principais

- [Kie.ai API Docs](https://docs.kie.ai/market/google/pro-image-to-image)
- [Gemini Pro Image Official Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Nano Banana Pro Prompting Guide (Google)](https://blog.google/products/gemini/prompting-tips-nano-banana-pro/)
- [Ultimate Nano Banana Pro Prompting Guide](https://www.atlabs.ai/blog/the-ultimate-nano-banana-pro-prompting-guide-mastering-gemini-3-pro-image)
- [Nano Banana Prompt Guide (Leonardo.ai)](https://leonardo.ai/news/nano-banana-prompt-guide/)
- [How to Use NanoBanana for FaceSwap](https://www.glbgpt.com/hub/how-to-use-nanobanana-for-faceswap-a-step-by-step-guide/)
- [GitHub awesome-nanobanana-pro](https://github.com/ZeroLu/awesome-nanobanana-pro)
- [Multi-Image Fusion Guide](https://sider.ai/blog/ai-tools/how-to-prompt-for-multi-image-fusion-in-nano-banana-for-complex-compositions)
- [Best Prompt Structure for Realism](https://sider.ai/blog/ai-image/best-prompt-structure-for-nano-banana-pro-realism-a-practical-guide)
- [Nano Banana JSON Prompting](https://aiformarketings.com/blog/nano-banana-json-guide/)
- [Face Swap + SeedVR2 Upscale Workflow](https://seedvr2.net/blog/tutorials/seedvr2-face-swap-qwen-edit-upscale-workflow-2026)
- [How to Make Gemini Not Change Your Face](https://www.media.io/ai-image-generator/fix-gemini-face-change.html)
- [How Many Images Can You Upload](https://www.glbgpt.com/hub/how-many-images-can-you-upload-to-nano-banana-pro-at-once/)
- [Nano Banana Pro Aspect Ratio Guide](https://www.aifreeapi.com/en/posts/nano-banana-pro-aspect-ratio-guide)
- [Character Consistency with KIE.AI](https://n8n.io/workflows/8019-generate-character-consistent-ai-images-with-kieai-nano-banana-api/)
- [Nano Banana Pro Photorealistic Tips](https://skywork.ai/blog/ai-image/nano-banana-pro-prompts/)
