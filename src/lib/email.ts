import nodemailer, { type Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const DEFAULT_FROM = "SOBRAPSI <noreply@sobrapsi.org.br>";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;

  if (!transporter) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject} (SMTP não configurado)`);
    return;
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
  } catch (error) {
    console.error("SMTP error:", error);
  }
}

export async function sendAccountActivationEmail(
  to: string,
  name: string,
  token: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${appUrl}/app/ativar-conta?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to,
    subject: "Ative sua conta — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua candidatura foi aprovada. Para acessar a área do associado, crie sua senha:</p>
      <p><a href="${link}">Ativar conta e definir senha</a></p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendApplicationReceivedEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Candidatura recebida — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Recebemos sua candidatura à SOBRAPSI. Sua solicitação será analisada pela equipe responsável.</p>
      <p>Acompanhe o status em: <a href="${appUrl}/acompanhar-candidatura">${appUrl}/acompanhar-candidatura</a></p>
      <p>Caso sejam necessárias informações complementares, você será notificado por e-mail.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendNewApplicationAdminNotification(
  applicationId: string,
  candidateName: string,
  categoryLabel: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@sobrapsi.org.br";
  await sendEmail({
    to: adminEmail,
    subject: `Nova candidatura — ${candidateName}`,
    html: `
      <p>Uma nova candidatura foi recebida na SOBRAPSI.</p>
      <p><strong>Candidato:</strong> ${candidateName}</p>
      <p><strong>Categoria:</strong> ${categoryLabel}</p>
      <p><a href="${appUrl}/admin">Abrir painel administrativo</a></p>
      <p>ID: ${applicationId}</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendApplicationApprovedPendingPaymentEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Candidatura aprovada — pagamento pendente — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua candidatura foi aprovada pela equipe da SOBRAPSI.</p>
      <p>Para concluir a associação, efetue o pagamento da taxa indicada pela secretaria.</p>
      <p>Após a confirmação do pagamento, sua conta de associado será criada automaticamente e você receberá um e-mail com os dados de acesso ao portal.</p>
      <p>Acompanhe o status em: <a href="${appUrl}/acompanhar-candidatura">${appUrl}/acompanhar-candidatura</a></p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendMemberApprovedAccountEmail(
  to: string,
  name: string,
  registrationNumber: string,
  category: string,
  cpfFormatted: string,
  defaultPassword: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const loginUrl = `${appUrl}/app/login`;

  await sendEmail({
    to,
    subject: "Candidatura aprovada — sua conta de associado foi criada — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua candidatura foi <strong>aprovada</strong> e você agora integra a SOBRAPSI na categoria <strong>${category}</strong>.</p>
      <p>Seu número de registro é <strong>${registrationNumber}</strong>.</p>
      <p>Criamos automaticamente sua <strong>conta de associado</strong> no portal da SOBRAPSI.</p>
      <p><strong>Acesso ao portal</strong></p>
      <ul>
        <li><strong>Login:</strong> CPF ${cpfFormatted}</li>
        <li><strong>Senha inicial:</strong> sua data de nascimento no formato ${defaultPassword}</li>
      </ul>
      <p><a href="${loginUrl}">Fazer login no portal</a></p>
      <p>Após o login, acesse sua área do associado para <strong>concluir o preenchimento do seu perfil público</strong>, revisar seus dados e acessar sua carteira digital.</p>
      <p>Por segurança, recomendamos alterar sua senha após o primeiro acesso.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendApplicationApprovedEmail(
  to: string,
  name: string,
  registrationNumber: string,
  category: string
) {
  await sendEmail({
    to,
    subject: "Candidatura aprovada — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua candidatura foi aprovada. Você agora integra a SOBRAPSI na categoria <strong>${category}</strong>.</p>
      <p>Seu número de registro é <strong>${registrationNumber}</strong>.</p>
      <p>Acesse sua área do associado para visualizar sua carteira digital e atualizar seu perfil institucional.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendApplicationRejectedEmail(to: string, name: string) {
  await sendEmail({
    to,
    subject: "Atualização sobre sua candidatura — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Após análise, sua candidatura não foi aprovada neste momento.</p>
      <p>Você poderá solicitar nova avaliação futuramente, conforme os critérios da SOBRAPSI.</p>
      <p>Em caso de dúvida, entre em contato pelo canal de atendimento.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendComplementRequestEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Complementação necessária — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua candidatura precisa de complementação. Acesse a candidatura ou acompanhe em:</p>
      <p><a href="${appUrl}/candidatura">Continuar candidatura</a> · <a href="${appUrl}/acompanhar-candidatura">Acompanhar status</a></p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendPaymentConfirmedEmail(
  to: string,
  name: string,
  amount: number
) {
  await sendEmail({
    to,
    subject: "Pagamento confirmado — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Confirmamos o recebimento do seu pagamento de <strong>R$ ${amount.toFixed(2)}</strong>.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendRenewalConfirmedEmail(
  to: string,
  name: string,
  registrationNumber: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Renovação confirmada — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua associação SOBRAPSI (<strong>${registrationNumber}</strong>) foi renovada com sucesso.</p>
      <p>Acesse sua <a href="${appUrl}/app/carteira">carteira digital</a> para baixar a nova versão.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendExpiryReminderEmail(
  to: string,
  name: string,
  registrationNumber: string,
  daysLeft: number,
  validUntil: Date
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const date = validUntil.toLocaleDateString("pt-BR");
  await sendEmail({
    to,
    subject: `Associação vence em ${daysLeft} dias — SOBRAPSI`,
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua associação SOBRAPSI (<strong>${registrationNumber}</strong>) vence em <strong>${daysLeft} dias</strong> (${date}).</p>
      <p><a href="${appUrl}/app/renovacao">Renovar associação</a></p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendMembershipExpiredEmail(
  to: string,
  name: string,
  registrationNumber: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Associação vencida — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua associação SOBRAPSI (<strong>${registrationNumber}</strong>) está vencida.</p>
      <p>Para reativar seu registro, <a href="${appUrl}/app/renovacao">renove sua associação</a>.</p>
      <p>— SOBRAPSI</p>
    `,
  });
}

export async function sendCardAvailableEmail(
  to: string,
  name: string,
  registrationNumber: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to,
    subject: "Carteira digital disponível — SOBRAPSI",
    html: `
      <p>Olá, ${name}.</p>
      <p>Sua carteira digital SOBRAPSI está disponível.</p>
      <p>Registro: <strong>${registrationNumber}</strong></p>
      <p><a href="${appUrl}/app/carteira">Acessar carteira digital</a></p>
      <p>— SOBRAPSI</p>
    `,
  });
}
