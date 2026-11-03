"use server";

import { validateContact } from "@/lib/contact-validation";
import { MailConfigError, sendContactEmail } from "@/lib/mail";
import type { ContactActionState } from "@/lib/types";

export async function sendContactMessage(
  _prev: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const name = String(formData.get("name") ?? "");

  // Honeypot: un humano no ve este campo. Responder éxito sin enviar.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { status: "success", name: name.trim() || "JUGADOR" };
  }

  const result = validateContact({
    name: formData.get("name"),
    email: formData.get("email"),
    msg: formData.get("msg"),
  });
  if (!result.ok) {
    return {
      status: "error",
      message: "REVISA LOS CAMPOS MARCADOS.",
      fieldErrors: result.fieldErrors,
    };
  }

  try {
    await sendContactEmail(result.data);
  } catch (err) {
    if (err instanceof MailConfigError) {
      console.error("[contacto] configuración de correo inválida:", err.message);
    } else {
      console.error("[contacto] fallo al enviar el correo:", err);
    }
    return {
      status: "error",
      message: "NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO MÁS TARDE.",
    };
  }

  return { status: "success", name: result.data.name };
}
