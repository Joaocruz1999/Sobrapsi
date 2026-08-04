import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(?:"([^"]*)"|'([^']*)'|(.*)\s*)$/);
  if (m) env[m[1]] = m[2] ?? m[3] ?? (m[4] ?? "").trim();
}
process.env.SMTP_HOST = env.SMTP_HOST;
process.env.SMTP_PORT = env.SMTP_PORT;
process.env.SMTP_SECURE = env.SMTP_SECURE;
process.env.SMTP_USER = env.SMTP_USER;
process.env.SMTP_PASS = env.SMTP_PASS;
process.env.EMAIL_FROM = env.EMAIL_FROM;

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 465);
const secure = process.env.SMTP_SECURE === "true";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM ?? `SOBRAPSI <${user}>`;
const to = process.env.ADMIN_TEST_TO ?? "admin@sobrapsi.org.br";

console.log(`[smtp-test] host=${host} port=${port} secure=${secure} user=${user} from=${from} to=${to}`);

const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

try {
  const info = await transporter.sendMail({
    from,
    to,
    subject: "[TESTE SMTP] SOBRAPSI — diagnóstico",
    html: "<p>E-mail de teste de SMTP enviado pelo script de diagnóstico.</p>",
  });
  console.log("[smtp-test] OK ->", JSON.stringify(info, null, 2));
} catch (err) {
  console.error("[smtp-test] FALHA:", err);
  process.exit(1);
}
