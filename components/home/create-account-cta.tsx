'use client';
import Link from 'next/link';
import { useSession } from '@/lib/session';
/** Botón "Crear cuenta" del hero: no se muestra con sesión iniciada. */
export function CreateAccountCta() {
    const { user, ready } = useSession();
    if (ready && user) return null;
    // Mientras se resuelve la sesión reserva el hueco (sin salto de layout ni parpadeo del botón).
    return (
        <Link
            className="btn xl magenta"
            href="/auth"
            aria-hidden={!ready}
            tabIndex={ready ? undefined : -1}
            style={ready ? undefined : { visibility: 'hidden' }}
        >
            ✦ CREAR CUENTA
        </Link>
    );
}
