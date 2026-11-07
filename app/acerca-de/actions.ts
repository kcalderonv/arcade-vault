'use server';
import { headers } from 'next/headers';
import { validateContact } from '@/lib/contact-validation';
import { MailConfigError, sendContactEmail } from '@/lib/mail';
import { CONTACT_LIMITS, hit } from '@/lib/rate-limit';
import type { ContactActionState } from '@/lib/types';
// IP del cliente: primer valor de `x-forwarded-for` (detrás de un proxy inverso). Sin cabecera, un cubo compartido.
async function clientIp(): Promise<string> {
    const forwarded = (await headers()).get('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || 'desconocida';
}
export async function sendContactMessage(_prev: ContactActionState, formData: FormData): Promise<ContactActionState> {
    const name = String(formData.get('name') ?? '');
    // Honeypot: un humano no ve este campo. Responder éxito sin enviar.
    if (String(formData.get('website') ?? '').trim() !== '') {
        return { status: 'success', name: name.trim() || 'JUGADOR' };
    }
    const result = validateContact({
        name: formData.get('name'),
        email: formData.get('email'),
        msg: formData.get('msg'),
    });
    if (!result.ok) {
        return {
            status: 'error',
            message: 'REVISA LOS CAMPOS MARCADOS.',
            fieldErrors: result.fieldErrors,
        };
    }
    // Límites (SPEC 15): primero por IP y luego global, para que un bloqueo por IP no gaste cupo global.
    const { perIp, global } = CONTACT_LIMITS;
    const ipLimit = hit(`contact:ip:${await clientIp()}`, perIp.limit, perIp.windowMs);
    if (!ipLimit.ok) {
        console.warn('[contacto] límite excedido: ip');
        const minutes = Math.max(1, Math.ceil(ipLimit.retryAfterSec / 60));
        return {
            status: 'error',
            message: `DEMASIADOS ENVÍOS. INTÉNTALO DE NUEVO EN ${minutes} ${minutes === 1 ? 'MINUTO' : 'MINUTOS'}.`,
        };
    }
    if (!hit('contact:global', global.limit, global.windowMs).ok) {
        console.warn('[contacto] límite excedido: global');
        return {
            status: 'error',
            message: 'SERVICIO OCUPADO. INTÉNTALO DE NUEVO MÁS TARDE.',
        };
    }
    try {
        await sendContactEmail(result.data);
    } catch (err) {
        if (err instanceof MailConfigError) {
            console.error('[contacto] configuración de correo inválida:', err.message);
        } else {
            console.error('[contacto] fallo al enviar el correo:', err);
        }
        return {
            status: 'error',
            message: 'NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO MÁS TARDE.',
        };
    }
    return { status: 'success', name: result.data.name };
}
