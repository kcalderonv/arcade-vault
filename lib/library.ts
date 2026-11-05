import { GAMES } from "@/lib/data";
import { getEngine } from "@/lib/games/registry";
import { createClient } from "@/lib/supabase/client";
import type { Category, LibraryGame } from "./types";

/**
 * Catálogo real: título y categoría desde `games`, mejor puntuación desde la
 * vista `game_best_scores`; la presentación (short/cover/color) sale de GAMES
 * por id. Orden de GAMES; ids de BD sin entrada en GAMES se ignoran.
 * Solo cliente (useEffect).
 */
export async function getLibraryGames(): Promise<LibraryGame[]> {
  const supabase = createClient();
  const [gamesRes, bestRes] = await Promise.all([
    supabase.from("games").select("id, title, cat"),
    supabase.from("game_best_scores").select("game_id, best"),
  ]);
  if (gamesRes.error) throw gamesRes.error;
  if (bestRes.error) throw bestRes.error;

  const best = new Map<string, number>(
    (bestRes.data ?? []).map((r) => [r.game_id as string, r.best as number]),
  );
  const rows = new Map(
    (gamesRes.data ?? []).map((r) => [r.id as string, r]),
  );

  const out: LibraryGame[] = [];
  for (const g of GAMES) {
    const row = rows.get(g.id);
    if (!row) continue;
    out.push({
      id: g.id,
      title: row.title as string,
      cat: row.cat as Category,
      short: g.short,
      cover: g.cover,
      color: g.color,
      best: best.get(g.id) ?? null,
      playable: getEngine(g.id) !== undefined,
    });
  }
  return out;
}
