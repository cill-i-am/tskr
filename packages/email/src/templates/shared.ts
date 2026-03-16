type EmailTemplateContent = {
  html: string
  subject: string
  text: string
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;")

export { escapeHtml }
export type { EmailTemplateContent }
