'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_SKIN, loadSkin, saveSkin, type SkinId } from './skins';
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key.startsWith('av_skin:')) cb();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(cb);
        window.removeEventListener('storage', onStorage);
    };
};
/** Skin elegido para un juego, persistido en localStorage. En SSR/hidratación devuelve `classic`. */
export function useSkin(gameId: string): [SkinId, (next: SkinId) => void] {
    const skin = useSyncExternalStore(
        subscribe,
        () => loadSkin(gameId),
        () => DEFAULT_SKIN,
    );
    const setSkin = useCallback(
        (next: SkinId) => {
            saveSkin(gameId, next);
            listeners.forEach((l) => l());
        },
        [gameId],
    );
    return [skin, setSkin];
}
