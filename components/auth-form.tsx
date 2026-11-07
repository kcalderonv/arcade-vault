'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
    authErrorMessage,
    normalizeUsername,
    safeNextPath,
    validateEmail,
    validatePassword,
    validateUsername,
} from '@/lib/auth';
import { useSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';
type Tab = 'in' | 'up';
type FieldErrors = Partial<Record<'username' | 'email' | 'password', string>>;
export function AuthForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = safeNextPath(searchParams.get('next'));
    const oauthFailed = searchParams.get('error') === 'oauth';
    const { user, ready } = useSession();
    const [tab, setTab] = useState<Tab>('in');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    // Con sesión iniciada (también tras entrar o registrarse) se vuelve a `next`.
    useEffect(() => {
        if (ready && user) router.replace(next);
    }, [ready, user, next, router]);
    const changeTab = (t: Tab) => {
        setTab(t);
        setFieldErrors({});
        setFormError(null);
        setNotice(null);
    };
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        const errors: FieldErrors = {};
        if (tab === 'up') {
            const msg = validateUsername(username);
            if (msg) errors.username = msg;
        }
        const emailMsg = validateEmail(email);
        if (emailMsg) errors.email = emailMsg;
        // En el login solo se exige que haya contraseña; la longitud mínima aplica al crearla.
        const passMsg = tab === 'up' ? validatePassword(password) : password ? null : 'ESCRIBE TU CONTRASEÑA.';
        if (passMsg) errors.password = passMsg;
        setFieldErrors(errors);
        setFormError(null);
        setNotice(null);
        if (Object.keys(errors).length > 0) return;
        setBusy(true);
        try {
            const supabase = createClient();
            if (tab === 'in') {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw error;
            } else {
                const name = normalizeUsername(username);
                const { data: free, error: availError } = await supabase.rpc('username_available', {
                    p_username: name,
                });
                if (availError) throw availError;
                if (!free) {
                    setFieldErrors({ username: 'ESE NOMBRE YA ESTÁ EN USO.' });
                    setBusy(false);
                    return;
                }
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: { data: { username: name } },
                });
                if (error) throw error;
                if (!data.session) {
                    // El proyecto exige confirmar el correo: no hay sesión hasta hacerlo.
                    setNotice('REVISA TU CORREO PARA CONFIRMAR LA CUENTA.');
                    setBusy(false);
                    return;
                }
            }
            // Éxito: el efecto de arriba redirige cuando la sesión y el perfil están listos.
        } catch (err) {
            console.error('[auth] error:', err);
            setFormError(authErrorMessage(err));
            setBusy(false);
        }
    };
    const guest = () => router.push('/');
    // OAuth (PKCE): el proveedor vuelve a /auth/callback, que crea la sesión y redirige a `next`.
    const oauth = async (provider: 'google' | 'github') => {
        if (busy) return;
        setBusy(true);
        setFormError(null);
        setNotice(null);
        try {
            const { error } = await createClient().auth.signInWithOAuth({
                provider,
                options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
            });
            if (error) throw error;
            // Éxito: el navegador sale hacia el proveedor.
        } catch (err) {
            console.error('[auth] oauth:', err);
            setFormError(authErrorMessage(err));
            setBusy(false);
        }
    };
    // Sin parpadeo: mientras se resuelve la sesión (o se redirige) no se pinta el formulario.
    if (!ready || user) return <div className="av-auth-wrap" aria-busy="true" />;
    return (
        <div className="av-auth-wrap fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="mark"></div>
                    <h2 className="neon-cyan">ARCADE VAULT</h2>
                    <div
                        className="mono"
                        style={{
                            fontSize: 11,
                            color: 'var(--ink-faint)',
                            letterSpacing: '0.16em',
                            marginTop: 6,
                        }}
                    >
                        ACCESO AL SISTEMA · v2.6
                    </div>
                </div>
                <div className="auth-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'in'}
                        className={tab === 'in' ? 'on' : ''}
                        onClick={() => changeTab('in')}
                    >
                        INICIAR SESIÓN
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'up'}
                        className={tab === 'up' ? 'on' : ''}
                        onClick={() => changeTab('up')}
                    >
                        CREAR CUENTA
                    </button>
                </div>
                <form onSubmit={submit} noValidate>
                    {(formError || oauthFailed) && (
                        <div className="term-error" role="alert">
                            <span className="prompt">&gt;</span>
                            {formError ?? 'NO SE PUDO INICIAR SESIÓN CON EL PROVEEDOR. INTÉNTALO DE NUEVO.'}
                        </div>
                    )}
                    {notice && (
                        <div className="toast-saved" role="status">
                            ▸ {notice}
                        </div>
                    )}
                    {tab === 'up' && (
                        <div className="field slide-in">
                            <label htmlFor="auth-username">Nombre de jugador</label>
                            <input
                                id="auth-username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toUpperCase().slice(0, 10))}
                                placeholder="PX_KAI"
                                autoComplete="nickname"
                                autoCapitalize="characters"
                                spellCheck={false}
                                aria-invalid={!!fieldErrors.username}
                                aria-describedby={fieldErrors.username ? 'auth-username-err' : undefined}
                            />
                            {fieldErrors.username && (
                                <div id="auth-username-err" className="field-error">
                                    {fieldErrors.username}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="field">
                        <label htmlFor="auth-email">Correo electrónico</label>
                        <input
                            id="auth-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jugador@vault.gg"
                            autoComplete="email"
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? 'auth-email-err' : undefined}
                        />
                        {fieldErrors.email && (
                            <div id="auth-email-err" className="field-error">
                                {fieldErrors.email}
                            </div>
                        )}
                    </div>
                    <div className="field">
                        <label htmlFor="auth-password">Contraseña</label>
                        <input
                            id="auth-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete={tab === 'in' ? 'current-password' : 'new-password'}
                            aria-invalid={!!fieldErrors.password}
                            aria-describedby={fieldErrors.password ? 'auth-password-err' : undefined}
                        />
                        {fieldErrors.password && (
                            <div id="auth-password-err" className="field-error">
                                {fieldErrors.password}
                            </div>
                        )}
                    </div>
                    {tab === 'in' && (
                        <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 6 }}>
                            <Link
                                href="/auth/recuperar"
                                className="mono"
                                style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.1em' }}
                            >
                                ¿OLVIDASTE TU CONTRASEÑA?
                            </Link>
                        </div>
                    )}
                    <button className="btn lg" type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
                        {busy ? 'ENVIANDO…' : tab === 'in' ? 'ENTRAR AL VAULT' : 'CREAR Y JUGAR'}
                    </button>
                </form>
                <button type="button" className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={guest}>
                    JUGAR COMO INVITADO
                </button>
                <div className="auth-divider">O CONTINÚA CON</div>
                <div className="social">
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => oauth('google')}>
                        ◆ GOOGLE
                    </button>
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => oauth('github')}>
                        ▣ GITHUB
                    </button>
                </div>
                <div
                    style={{
                        marginTop: 18,
                        textAlign: 'center',
                        fontSize: 11,
                        color: 'var(--ink-faint)',
                        letterSpacing: '0.1em',
                    }}
                >
                    AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
                </div>
            </div>
        </div>
    );
}
