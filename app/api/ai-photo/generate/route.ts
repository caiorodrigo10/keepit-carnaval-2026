import { NextResponse } from "next/server";
import { validateGenerateRequest } from "@/lib/ai-photo/validations";
import {
  leadExists,
  hasReachedLimit,
  createGeneration,
} from "@/lib/ai-photo/generate";
import type { GenerateRequest, GenerateResponse, AiPhotoErrorResponse } from "@/types/ai-photo";

export const maxDuration = 180; // Allow up to 180s for Kie.ai nano-banana-pro (polling)

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;

    // Validate request body
    const validationError = validateGenerateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError, code: "INVALID_PHOTO" } satisfies AiPhotoErrorResponse,
        { status: 400 }
      );
    }

    // Verify lead exists
    const exists = await leadExists(body.lead_id);
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Lead nao encontrado", code: "LEAD_NOT_FOUND" } satisfies AiPhotoErrorResponse,
        { status: 404 }
      );
    }

    // Check generation limit
    const limitReached = await hasReachedLimit(body.lead_id);
    if (limitReached) {
      return NextResponse.json(
        {
          success: false,
          error: "Voce ja atingiu o limite de geracoes de fotos com IA",
          code: "GENERATION_LIMIT",
        } satisfies AiPhotoErrorResponse,
        { status: 429 }
      );
    }

    // Generate via Kie.ai nano-banana-pro — v2: single photo clothing swap
    const generationId = await createGeneration(body.lead_id, body.photo_url);

    return NextResponse.json(
      { success: true, generation_id: generationId } satisfies GenerateResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error("[ai-photo/generate] Error:", error);

    const isAiError =
      error instanceof Error &&
      (error.message.includes("Kie.ai") || error.message.includes("timed out"));

    return NextResponse.json(
      {
        success: false,
        error: isAiError
          ? "Erro ao gerar foto com IA. Tente novamente em alguns minutos."
          : "Erro interno do servidor",
        code: isAiError ? "AI_ERROR" : "INTERNAL_ERROR",
      } satisfies AiPhotoErrorResponse,
      { status: isAiError ? 502 : 500 }
    );
  }
}
