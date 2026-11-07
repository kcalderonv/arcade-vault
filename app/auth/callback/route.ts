import { connection, NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
const RECOVERY_PATH = '/auth/restablecer';
// Destino del enlace del correo de recuperación y del retorno de OAuth (PKCE): intercambia el `code`
// por una sesión (cookies) y redirige a una ruta interna. Si falla, vuelve a la pantalla de origen
// (recuperación u OAuth) sin exponer el error.
export async function GET(request: NextRequest) {
    // Con `cacheComponents` el handler GET se prerenderiza por defecto; esto lo hace dependiente de la petición.
    await connection();
    const { searchParams, origin } = request.nextUrl;
    const code = searchParams.get('code');
    const next = safeNextPath(searchParams.get('next') ?? RECOVERY_PATH);
    if (code) {
        try {
            const supabase = await createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) return NextResponse.redirect(new URL(next, origin));
            console.error('[auth/callback] exchangeCodeForSession falló:', error.code ?? error.name);
        } catch (err) {
            console.error('[auth/callback] fallo inesperado:', err);
        }
    } else {
        // Sin `code`: el proveedor devolvió un error o el usuario canceló.
        console.error('[auth/callback] sin code:', searchParams.get('error') ?? 'desconocido');
    }
    const failure = next === RECOVERY_PATH ? '/auth/recuperar?error=enlace' : '/auth?error=oauth';
    return NextResponse.redirect(new URL(failure, origin));
}
