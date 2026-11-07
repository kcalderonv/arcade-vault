'use server';
import { getGame } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { SubmitScoreResult } from '@/lib/types';
const MAX_SCORE = 9_999_999;
const GENERIC_ERROR = 'NO SE PUDO GUARDAR LA PUNTUACIÓN. INTÉNTALO DE NUEVO.';
const SESSION_ERROR = 'TU SESIÓN HA CADUCADO. INICIA SESIÓN DE NUEVO PARA GUARDAR.';
// La identidad y el nombre salen de la sesión (auth.uid() y profiles), nunca del cliente.
export async function submitScore(game: string, score: number): Promise<SubmitScoreResult> {
    if (typeof game !== 'string' || !getGame(game) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        return { ok: false, error: 'DATOS DE PUNTUACIÓN NO VÁLIDOS.' };
    }
    try {
        const supabase = await createClient();
        const { error } = await supabase.rpc('submit_score', { p_game: game, p_score: score });
        if (error) {
            // 28000: submit_score sin sesión (invalid_authorization_specification).
            if (error.code === '28000') return { ok: false, error: SESSION_ERROR };
            console.error('[submit_score] error de Supabase:', error);
            return { ok: false, error: GENERIC_ERROR };
        }
    } catch (err) {
        console.error('[submit_score] fallo inesperado:', err);
        return { ok: false, error: GENERIC_ERROR };
    }
    return { ok: true };
}
