import { createClient } from '@/lib/supabase/client';
import type { LeaderboardRow } from './types';
const COLUMNS = 'id, player_name, score, created_at';
/** Top por juego: score desc y, en empate, el más antiguo primero. Solo cliente (useEffect). */
export async function getTopScores(gameId: string, limit = 10): Promise<LeaderboardRow[]> {
    const { data, error } = await createClient()
        .from('scores')
        .select(COLUMNS)
        .eq('game_id', gameId)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
}
/** Mejor puntaje de un usuario (por `user_id`, incluidos los guardados con un nombre anterior) en un juego, o null. */
export async function getBestScore(gameId: string, userId: string): Promise<LeaderboardRow | null> {
    const { data, error } = await createClient()
        .from('scores')
        .select(COLUMNS)
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
}
