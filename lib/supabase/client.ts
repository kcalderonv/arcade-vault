import { createBrowserClient } from '@supabase/ssr';
// Cliente de Supabase para Client Components. Usa solo la clave publicable.
// Las variables NEXT_PUBLIC_* se deben leer con acceso literal para que Next las incruste.
export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url) throw new Error('Falta la variable NEXT_PUBLIC_SUPABASE_URL');
    if (!key) {
        throw new Error('Falta la variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    }
    return createBrowserClient(url, key);
}
