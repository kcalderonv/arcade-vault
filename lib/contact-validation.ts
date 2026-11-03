import type { ContactFieldErrors, ContactPayload } from "./types";

const EMAIL_RE = /^[^\s@<>()[\]\,;:"]+@[^\s@<>()[\]\,;:"]+\.[^\s@<>()[\]\,;:"]{2,}$/;

export const LIMITS = { name: 60, email: 120, msg: 2000 } as const;

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validateContact(
  input: unknown,
):
  | { ok: true; data: ContactPayload }
  | { ok: false; fieldErrors: ContactFieldErrors } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const data: ContactPayload = {
    name: asText(raw.name),
    email: asText(raw.email),
    msg: asText(raw.msg),
  };
  const fieldErrors: ContactFieldErrors = {};

  if (!data.name) fieldErrors.name = "El nombre es obligatorio.";
  else if (data.name.length > LIMITS.name)
    fieldErrors.name = `Máximo ${LIMITS.name} caracteres.`;

  if (!data.email) fieldErrors.email = "El correo es obligatorio.";
  else if (data.email.length > LIMITS.email || !EMAIL_RE.test(data.email))
    fieldErrors.email = "Introduce un correo válido.";

  if (!data.msg) fieldErrors.msg = "El mensaje es obligatorio.";
  else if (data.msg.length > LIMITS.msg)
    fieldErrors.msg = `Máximo ${LIMITS.msg} caracteres.`;

  return Object.keys(fieldErrors).length
    ? { ok: false, fieldErrors }
    : { ok: true, data };
}
