import { FROM_EMAIL } from "../../env.js";

type MailData = {
  from?: string;
  to: string;
  subject: string;
  body: string;
};

export class Mail {
  key: string;
  constructor(key: string) {
    this.key = key;
  }
  async send({ from, to, subject, body }: MailData) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`,
        },
        body: JSON.stringify({
          from: from || FROM_EMAIL,
          to,
          subject,
          html: body,
        }),
      });
      if (!response.ok) throw new Error(response.statusText);
      return { ok: true, response };
    } catch (err) {
      console.error("Erro ao enviar e-mail:", err);
      return { ok: false };
    }
  }
}
