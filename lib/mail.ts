import nodemailer, { type Transporter } from "nodemailer";
import type { ContactPayload } from "./types";

// Solo servidor: lee SMTP_* / CONTACT_* del entorno. Nunca importar desde un Client Component.

export class MailConfigError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MailConfigError(`Falta la variable de entorno ${name}`);
  return value;
}

// Elimina saltos de línea para evitar inyección de cabeceras.
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export function getTransport(): Transporter {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  if (!Number.isInteger(port) || port <= 0)
    throw new MailConfigError("SMTP_PORT no es un puerto válido");

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (user && !pass)
    throw new MailConfigError("SMTP_USER está definido pero falta SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    // Sin SMTP_USER: servidor local sin autenticación.
    ...(user ? { auth: { user, pass } } : {}),
  });
}

export async function sendContactEmail(data: ContactPayload): Promise<void> {
  const to = requireEnv("CONTACT_TO");
  const from = requireEnv("CONTACT_FROM");
  const transport = getTransport();

  const name = oneLine(data.name);
  const email = oneLine(data.email);

  await transport.sendMail({
    from,
    to,
    replyTo: email,
    subject: `[Arcade Vault] Mensaje de contacto de ${name}`,
    text: `Nombre: ${name}\nCorreo: ${email}\n\n${data.msg}\n`,
  });
}
