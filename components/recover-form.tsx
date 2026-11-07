'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authErrorMessage, validateEmail } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
export function RecoverForm() {
    const linkFailed = useSearchParams().get('error') === 'enlace';
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        const msg = validateEmail(email);
        setEmailError(msg);
        setFormError(null);
        if (msg) return;
        setBusy(true);
        try {
            const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/restablecer`,
            });
            if (error) {
                const text = authErrorMessage(error);
                // Respuesta genérica: solo se distinguen los límites de uso y la falta de red.
                if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
                    setFormError(text);
                    return;
                }
                console.error('[auth] resetPasswordForEmail:', error);
            }
            setSent(true);
        } catch (err) {
            console.error('[auth] error:', err);
            setFormError(authErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="av-auth-wrap fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="mark"></div>
                    <h2 className="neon-cyan">RECUPERAR ACCESO</h2>
                    <div
                        className="mono"
                        style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.16em', marginTop: 6 }}
                    >
                        TE ENVIAMOS UN ENLACE PARA ELEGIR UNA NUEVA CONTRASEÑA
                    </div>
                </div>
                {linkFailed && (
                    <div className="term-error" role="alert">
                        <span className="prompt">&gt;</span>
                        ENLACE NO VÁLIDO O CADUCADO. PIDE UNO NUEVO.
                    </div>
                )}
                {sent ? (
                    <div className="toast-saved" role="status">
                        ▸ SI EL CORREO EXISTE, TE ENVIAMOS UN ENLACE_
                    </div>
                ) : (
                    <form onSubmit={submit} noValidate>
                        {formError && (
                            <div className="term-error" role="alert">
                                <span className="prompt">&gt;</span>
                                {formError}
                            </div>
                        )}
                        <div className="field">
                            <label htmlFor="rec-email">Correo electrónico</label>
                            <input
                                id="rec-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="jugador@vault.gg"
                                autoComplete="email"
                                aria-invalid={!!emailError}
                                aria-describedby={emailError ? 'rec-email-err' : undefined}
                            />
                            {emailError && (
                                <div id="rec-email-err" className="field-error">
                                    {emailError}
                                </div>
                            )}
                        </div>
                        <button
                            className="btn lg"
                            type="submit"
                            disabled={busy}
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            {busy ? 'ENVIANDO…' : 'ENVIAR ENLACE'}
                        </button>
                    </form>
                )}
                <Link className="btn ghost" href="/auth" style={{ width: '100%', marginTop: 10, textAlign: 'center' }}>
                    VOLVER A INICIAR SESIÓN
                </Link>
            </div>
        </div>
    );
}
