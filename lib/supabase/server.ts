import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
// Cliente de Supabase para Route Handlers, Server Actions y límites dinámicos.
// Con `cacheComponents` no debe usarse en el render estático de una página.
export async function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url) throw new Error('Falta la variable NEXT_PUBLIC_SUPABASE_URL');
    if (!key) {
        throw new Error('Falta la variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    }
    const cookieStore = await cookies();
    return createServerClient(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // Se llama desde un Server Component: no se pueden escribir cookies.
                    // Es seguro ignorarlo porque proxy.ts ya refresca la sesión.
                }
            },
        },
    });
}
