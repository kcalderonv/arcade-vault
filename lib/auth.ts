/** Utilidades puras de autenticación (sin acceso a red). Mensajes en español y mayúsculas, como el resto de la UI. */
export const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
/** Recorta y pasa a mayúsculas el nombre de jugador. */
export function normalizeUsername(raw: string): string {
    return raw.trim().toUpperCase();
}
export function validateUsername(raw: string): string | null {
    const name = normalizeUsername(raw);
    if (name.length < 3 || name.length > 10) return 'EL NOMBRE DEBE TENER ENTRE 3 Y 10 CARACTERES.';
    if (!USERNAME_RE.test(name)) return 'SOLO LETRAS (A-Z), NÚMEROS Y GUION BAJO.';
    return null;
}
export function validateEmail(raw: string): string | null {
    const email = raw.trim();
    if (!email) return 'ESCRIBE TU CORREO ELECTRÓNICO.';
    if (email.length > 120 || !EMAIL_RE.test(email)) return 'CORREO ELECTRÓNICO NO VÁLIDO.';
    return null;
}
export function validatePassword(raw: string): string | null {
    if (raw.length < PASSWORD_MIN) return `LA CONTRASEÑA DEBE TENER AL MENOS ${PASSWORD_MIN} CARACTERES.`;
    if (raw.length > PASSWORD_MAX) return `LA CONTRASEÑA NO PUEDE SUPERAR ${PASSWORD_MAX} CARACTERES.`;
    return null;
}
/** Devuelve `raw` solo si es una ruta interna (empieza por `/` y no por `//` ni `/\`); si no, `/`. */
export function safeNextPath(raw: string | null | undefined): string {
    if (typeof raw !== 'string') return '/';
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
    if (/[\u0000-\u001f]/.test(raw)) return '/';
    return raw;
}
const GENERIC_ERROR = 'ALGO SALIÓ MAL. INTÉNTALO DE NUEVO.';
/** Traduce errores de Supabase Auth a mensajes en español, sin detalles internos. */
export function authErrorMessage(error: unknown): string {
    const e = (error ?? {}) as { code?: string; status?: number; message?: string; name?: string };
    switch (e.code) {
        case 'invalid_credentials':
            return 'CORREO O CONTRASEÑA INCORRECTOS.';
        case 'user_already_exists':
        case 'email_exists':
            return 'ESE CORREO YA ESTÁ REGISTRADO.';
        case 'weak_password':
            return 'CONTRASEÑA DEMASIADO DÉBIL.';
        case 'email_address_invalid':
        case 'validation_failed':
            return 'CORREO ELECTRÓNICO NO VÁLIDO.';
        case 'over_request_rate_limit':
        case 'over_email_send_rate_limit':
            return 'DEMASIADOS INTENTOS. ESPERA UN MOMENTO.';
        case 'unexpected_failure':
        case 'signup_disabled':
            break;
        case 'same_password':
            return 'LA NUEVA CONTRASEÑA DEBE SER DISTINTA A LA ANTERIOR.';
        case 'session_not_found':
        case 'refresh_token_not_found':
            return 'LA SESIÓN HA CADUCADO. INICIA SESIÓN DE NUEVO.';
    }
    // El trigger de alta de perfil falla (nombre repetido por carrera o inválido).
    if (typeof e.message === 'string' && /database error saving new user/i.test(e.message)) {
        return 'NO SE PUDO CREAR LA CUENTA. PRUEBA OTRO NOMBRE.';
    }
    if (
        e.status === 0 ||
        e.name === 'AuthRetryableFetchError' ||
        (typeof e.message === 'string' && /failed to fetch|network/i.test(e.message))
    ) {
        return 'SIN CONEXIÓN. REVISA TU RED E INTÉNTALO DE NUEVO.';
    }
    return GENERIC_ERROR;
}
