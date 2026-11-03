import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
// Refresca la sesión de Supabase y propaga las cookies a la petición y la respuesta.
// No redirige ni bloquea ninguna ruta.
export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    // Sin configuración, la app sigue funcionando (la sesión actual no depende de Supabase).
    if (!url || !key) {
        console.error('Supabase: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
        return response;
    }
    const supabase = createServerClient(url, key, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });
    try {
        // Valida el token y dispara el refresco de cookies si hace falta.
        await supabase.auth.getUser();
    } catch (error) {
        console.error('Supabase: no se pudo refrescar la sesión', error);
    }
    return response;
}
