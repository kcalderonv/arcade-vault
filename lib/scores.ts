import type { SavedScore } from "./types";

const KEY = "av_scores";

/** Añade una puntuación a localStorage["av_scores"]. Solo en el cliente (manejadores de eventos). */
export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    const raw = localStorage.getItem(KEY);
    const all: SavedScore[] = raw ? JSON.parse(raw) : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // localStorage bloqueado: la app sigue funcionando sin persistir.
  }
}
