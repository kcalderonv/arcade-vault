"use server";

import { getGame } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { SubmitScoreResult } from "@/lib/types";

const MAX_SCORE = 9_999_999;
const GENERIC_ERROR = "NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.";

export async function submitScore(
  game: string,
  name: string,
  score: number,
): Promise<SubmitScoreResult> {
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (
    typeof game !== "string" ||
    !getGame(game) ||
    cleanName.length < 1 ||
    cleanName.length > 10 ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return { ok: false, error: "DATOS DE PUNTUACIÓN NO VÁLIDOS." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_score", {
      p_game: game,
      p_name: cleanName,
      p_score: score,
    });
    if (error) {
      console.error("[submit_score] error de Supabase:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[submit_score] fallo inesperado:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}
