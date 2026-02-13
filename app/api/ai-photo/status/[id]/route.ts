import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/ai-photo/validations";
import type {
  AiPhotoGeneration,
  StatusResponse,
  AiPhotoErrorResponse,
} from "@/types/ai-photo";

/**
 * GET /api/ai-photo/status/[id]
 *
 * With Gemini direct API, the /generate route is synchronous and
 * finishes with status completed/failed. This endpoint is still
 * useful for the frontend to check the result after the generate
 * call returns, or if the client disconnects mid-generation.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido", code: "GENERATION_NOT_FOUND" } satisfies AiPhotoErrorResponse,
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data } = await supabase
      .from("ai_photo_generations")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Geracao nao encontrada", code: "GENERATION_NOT_FOUND" } satisfies AiPhotoErrorResponse,
        { status: 404 }
      );
    }

    const gen = data as unknown as AiPhotoGeneration;

    return NextResponse.json(buildStatusResponse(gen));
  } catch (error) {
    console.error("[ai-photo/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor", code: "INTERNAL_ERROR" } satisfies AiPhotoErrorResponse,
      { status: 500 }
    );
  }
}

function buildStatusResponse(gen: AiPhotoGeneration): StatusResponse {
  return {
    success: true,
    generation: {
      id: gen.id,
      status: gen.status,
      variants: [
        { status: gen.variant_1_status, url: gen.variant_1_url },
        { status: gen.variant_2_status, url: gen.variant_2_url },
        { status: gen.variant_3_status, url: gen.variant_3_url },
      ],
      error_message: gen.error_message,
      created_at: gen.created_at,
      completed_at: gen.completed_at,
    },
  };
}
