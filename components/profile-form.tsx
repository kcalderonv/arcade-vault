'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { normalizeUsername, validateUsername } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/client';
export function ProfileForm() {
    const { user, ready, logout, refresh } = useSession();
    const [email, setEmail] = useState<string | null>(null);
    const [nameEdit, setNameEdit] = useState<string | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const userId = user?.id ?? null;
    // Correo (solo lectura) desde Auth.
    useEffect(() => {
        if (!userId) return;
        let active = true;
        createClient()
            .auth.getUser()
            .then(({ data }) => {
                if (active) setEmail(data.user?.email ?? null);
            });
        return () => {
            active = false;
        };
    }, [userId]);
    const value = nameEdit ?? user?.name ?? '';
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy || !user) return;
        setSaved(false);
        setFormError(null);
        const msg = validateUsername(value);
        setNameError(msg);
        if (msg) return;
        const name = normalizeUsername(value);
        if (name === user.name) {
            setNameError('ESE YA ES TU NOMBRE ACTUAL.');
            return;
        }
        setBusy(true);
        try {
            const supabase = createClient();
            const { data: free, error: availError } = await supabase.rpc('username_available', { p_username: name });
            if (availError) throw availError;
            if (!free) {
                setNameError('ESE NOMBRE YA ESTÁ EN USO.');
                return;
            }
            const { error } = await supabase.from('profiles').update({ username: name }).eq('id', user.id);
            if (error) {
                // 23505: nombre tomado entre la comprobación y el guardado.
                if (error.code === '23505') {
                    setNameError('ESE NOMBRE YA ESTÁ EN USO.');
                    return;
                }
                throw error;
            }
            await refresh();
            setNameEdit(null);
            setSaved(true);
        } catch (err) {
            console.error('[perfil] no se pudo cambiar el nombre:', err);
            setFormError('NO SE PUDO GUARDAR EL NOMBRE. INTÉNTALO DE NUEVO.');
        } finally {
            setBusy(false);
        }
    };
    if (!ready) return <div className="av-auth-wrap" aria-busy="true" />;
    if (!user) {
        return (
            <div className="av-auth-wrap fade-in">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="mark"></div>
                        <h2 className="neon-cyan">PERFIL</h2>
                    </div>
                    <div className="mono" role="status" style={{ textAlign: 'center', color: 'var(--ink-dim)' }}>
                        ▸ INICIA SESIÓN PARA VER TU PERFIL
                    </div>
                    <Link
                        className="btn lg"
                        href="/auth?next=/perfil"
                        style={{ width: '100%', marginTop: 16, textAlign: 'center' }}
                    >
                        INICIAR SESIÓN
                    </Link>
                </div>
            </div>
        );
    }
    return (
        <div className="av-auth-wrap fade-in">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="mark"></div>
                    <h2 className="neon-cyan">PERFIL</h2>
                    <div
                        className="mono"
                        style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.16em', marginTop: 6 }}
                    >
                        JUGADOR {user.name}
                    </div>
                </div>
                <form onSubmit={submit} noValidate>
                    {formError && (
                        <div className="term-error" role="alert">
                            <span className="prompt">&gt;</span>
                            {formError}
                        </div>
                    )}
                    {saved && (
                        <div className="toast-saved" role="status">
                            ▸ NOMBRE ACTUALIZADO_
                        </div>
                    )}
                    <div className="field">
                        <label htmlFor="perfil-email">Correo electrónico</label>
                        <input id="perfil-email" value={email ?? ''} readOnly disabled />
                    </div>
                    <div className="field">
                        <label htmlFor="perfil-username">Nombre de jugador</label>
                        <input
                            id="perfil-username"
                            value={value}
                            onChange={(e) => {
                                setNameEdit(e.target.value.toUpperCase().slice(0, 10));
                                setSaved(false);
                            }}
                            autoComplete="nickname"
                            autoCapitalize="characters"
                            spellCheck={false}
                            aria-invalid={!!nameError}
                            aria-describedby={nameError ? 'perfil-username-err' : undefined}
                        />
                        {nameError && (
                            <div id="perfil-username-err" className="field-error">
                                {nameError}
                            </div>
                        )}
                    </div>
                    <button className="btn lg" type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
                        {busy ? 'GUARDANDO…' : 'GUARDAR NOMBRE'}
                    </button>
                </form>
                <button
                    type="button"
                    className="btn ghost"
                    style={{ width: '100%', marginTop: 10 }}
                    onClick={() => void logout()}
                >
                    CERRAR SESIÓN
                </button>
            </div>
        </div>
    );
}
