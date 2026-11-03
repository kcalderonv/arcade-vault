import { connection, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// Diagnóstico de conexión con Supabase. No expone claves, URL ni detalles internos.
export async function GET() {
    // Con `cacheComponents` el handler GET se prerenderiza por defecto; esto lo
    // marca como dependiente de la petición y evita ejecutarlo durante el build.
    await connection();
    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        // getSession() sin cookies no hace red: se consulta el health de Auth
        // para comprobar de verdad que el proyecto responde.
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
            headers: {
                apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Supabase Auth health respondió ${res.status}`);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Supabase /api/salud falló:', error);
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}
