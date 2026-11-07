'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authErrorMessage, validatePassword } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';
export function ResetPasswordForm() {
    const router = useRouter();
    const { user, ready } = useSession();
    const [password, setPassword] = useState('');
    const [passError, setPassError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        const msg = validatePassword(password);
        setPassError(msg);
        setFormError(null);
        if (msg) return;
        setBusy(true);
        try {
            const { error } = await createClient().auth.updateUser({ password });
            if (error) throw error;
            router.replace('/');
        } catch (err) {
            console.error('[auth] updateUser:', err);
            setFormError(authErrorMessage(err));
            setBusy(false);
        }
    };
    if (!ready) return <div className="av-auth-wrap" aria-busy="true" />;
    return (
        <div className="av-auth-wrap fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="mark"></div>
                    <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
                </div>
                {!user ? (
                    <>
                        <div className="term-error" role="alert">
                            <span className="prompt">&gt;</span>
                            ENLACE NO VÁLIDO O CADUCADO.
                        </div>
                        <Link
                            className="btn lg"
                            href="/auth/recuperar"
                            style={{ width: '100%', marginTop: 8, textAlign: 'center' }}
                        >
                            PEDIR UN ENLACE NUEVO
                        </Link>
                    </>
                ) : (
                    <form onSubmit={submit} noValidate>
                        {formError && (
                            <div className="term-error" role="alert">
                                <span className="prompt">&gt;</span>
                                {formError}
                            </div>
                        )}
                        <div className="field">
                            <label htmlFor="new-password">Nueva contraseña</label>
                            <input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                aria-invalid={!!passError}
                                aria-describedby={passError ? 'new-password-err' : undefined}
                            />
                            {passError && (
                                <div id="new-password-err" className="field-error">
                                    {passError}
                                </div>
                            )}
                        </div>
                        <button
                            className="btn lg"
                            type="submit"
                            disabled={busy}
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            {busy ? 'GUARDANDO…' : 'GUARDAR CONTRASEÑA'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
