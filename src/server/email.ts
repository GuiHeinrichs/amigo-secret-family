import "server-only";

/**
 * Envio de e-mail. Em produção usa a API HTTP do Resend (RESEND_API_KEY e
 * EMAIL_FROM). Sem chave configurada, nada é enviado e `sent` volta `false`:
 * no dev local, a tela de login mostra o código em vez de mandá-lo.
 */
export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { sent: false };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM?.trim() || "Laço <onboarding@resend.dev>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) {
    console.error("Falha ao enviar e-mail:", response.status, await response.text());
    throw new Error("Não foi possível enviar o e-mail.");
  }
  return { sent: true };
}
