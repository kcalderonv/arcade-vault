'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SessionUser } from './types';
interface SessionContextValue {
    user: SessionUser | null;
    /** false hasta resolver la sesión inicial y el perfil (evita el parpadeo de "Iniciar Sesión"). */
    ready: boolean;
    logout: () => Promise<void>;
    /** Recarga el perfil (p. ej. tras renombrar al jugador). */
    refresh: () => Promise<void>;
}
const SessionContext = createContext<SessionContextValue | null>(null);
interface Profile {
    id: string;
    name: string | null; // null: el usuario existe pero no tiene perfil
}
/** Lee el nombre de jugador. Sin perfil no hay jugador válido: se registra el fallo y se cierra la sesión. */
async function fetchProfile(id: string): Promise<Profile> {
    const supabase = createClient();
    const { data, error } = await supabase.from('profiles').select('username').eq('id', id).maybeSingle();
    if (error || !data) {
        console.error('[session] no se pudo cargar el perfil:', error ?? 'perfil inexistente');
        await supabase.auth.signOut();
        return { id, name: null };
    }
    return { id, name: data.username };
}
export function SessionProvider({ children }: { children: ReactNode }) {
    // undefined = sesión aún sin resolver; null = sin sesión.
    const [userId, setUserId] = useState<string | null | undefined>(undefined);
    const [profile, setProfile] = useState<Profile | undefined>(undefined);
    // Solo actualiza estado dentro del callback (sin llamadas a Supabase: evita bloqueos del cliente de Auth).
    useEffect(() => {
        const { data } = createClient().auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user.id ?? null);
        });
        return () => data.subscription.unsubscribe();
    }, []);
    // El perfil se carga en un efecto aparte, cuando cambia el usuario (el estado se fija en el .then).
    useEffect(() => {
        if (!userId) return;
        let active = true;
        fetchProfile(userId).then((p) => {
            if (active) setProfile(p);
        });
        return () => {
            active = false;
        };
    }, [userId]);
    const logout = useCallback(async () => {
        await createClient().auth.signOut();
    }, []);
    const refresh = useCallback(async () => {
        if (userId) setProfile(await fetchProfile(userId));
    }, [userId]);
    const user = useMemo<SessionUser | null>(() => {
        if (!userId || profile?.id !== userId || !profile.name) return null;
        return { id: userId, name: profile.name };
    }, [userId, profile]);
    const ready = userId === null || (userId !== undefined && profile?.id === userId);
    const value = useMemo(() => ({ user, ready, logout, refresh }), [user, ready, logout, refresh]);
    return <SessionContext value={value}>{children}</SessionContext>;
}
export function useSession(): SessionContextValue {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
    return ctx;
}
