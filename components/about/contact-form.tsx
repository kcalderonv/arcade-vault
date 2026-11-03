"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { sendContactMessage } from "@/app/acerca-de/actions";
import type { ContactActionState } from "@/lib/types";

const EMPTY = { name: "", email: "", msg: "" };
const IDLE: ContactActionState = { status: "idle" };

// El `key` remonta el formulario y reinicia el estado de la acción ("ENVIAR OTRO MENSAJE").
export function ContactForm() {
  const [round, setRound] = useState(0);
  return <ContactFormInner key={round} onReset={() => setRound((r) => r + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(sendContactMessage, IDLE);
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Validación visual previa: con campos vacíos no se llama al servidor.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      e.preventDefault();
      setShake(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShake(false), 400);
    }
  };

  const fe = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      {state.status !== "success" ? (
        <>
          {state.status === "error" && (
            <div className="term-error" role="alert">
              <span className="prompt">vault@arcade:~$</span>
              &gt; ERROR: {state.message}
            </div>
          )}
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
              maxLength={60}
              disabled={pending}
            />
            {fe?.name && <span className="field-error">{fe.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
              maxLength={120}
              disabled={pending}
            />
            {fe?.email && <span className="field-error">{fe.email}</span>}
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={2000}
              disabled={pending}
            ></textarea>
            {fe?.msg && <span className="field-error">{fe.msg}</span>}
          </div>
          {/* Honeypot: invisible para personas, los bots suelen rellenarlo. */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">NO RELLENAR</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>
          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
