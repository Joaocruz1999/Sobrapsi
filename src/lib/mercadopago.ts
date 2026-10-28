import "server-only";

import { ANNUAL_FEE_INSTALLMENTS } from "@/lib/constants";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

interface MercadoPagoPayerCost {
  installments: number;
  installment_rate: number;
  installment_amount: number;
  total_amount: number;
  payment_method_option_id: string;
}

interface MercadoPagoInstallmentPlan {
  payer_costs: MercadoPagoPayerCost[];
}

interface MercadoPagoCredentials {
  accessToken: string;
  publicKey: string;
  mode: "production" | "test";
}

function getProductionCredentialPair(): MercadoPagoCredentials | null {
  const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
  const publicKey =
    process.env.MP_PUBLIC_KEY?.trim() ?? process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim();

  if (!accessToken || !publicKey) return null;

  return { accessToken, publicKey, mode: "production" };
}

function getTestCredentialPair(): MercadoPagoCredentials | null {
  const accessToken = process.env.MP_ACCESS_TOKEN_TEST?.trim();
  const publicKey =
    process.env.MP_PUBLIC_KEY_TEST?.trim() ??
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_TEST?.trim();

  if (!accessToken || !publicKey) return null;

  return { accessToken, publicKey, mode: "test" };
}

function getCredentialPair(): MercadoPagoCredentials | null {
  const preferTest = process.env.MP_ENV !== "production";
  const test = getTestCredentialPair();
  const production = getProductionCredentialPair();

  if (preferTest && test) return test;
  if (production) return production;
  if (test) return test;

  return null;
}

export function isMercadoPagoConfigured() {
  return Boolean(getCredentialPair());
}

export function isMercadoPagoTestMode() {
  return process.env.MP_ENV !== "production";
}

export function getMercadoPagoPublicKey() {
  const credentials = getCredentialPair();
  if (!credentials) {
    throw new Error("Chave pública do Mercado Pago não configurada");
  }

  return credentials.publicKey;
}

function getAccessToken() {
  const credentials = getCredentialPair();
  if (!credentials) {
    throw new Error("Access token do Mercado Pago não configurado");
  }

  return credentials.accessToken;
}

export function usesMercadoPagoTestCredentials() {
  return getCredentialPair()?.mode === "test";
}

function getClient() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Access token do Mercado Pago não configurado");
  }

  return new MercadoPagoConfig({ accessToken });
}

function isPublicNotificationHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
}

export function getWebhookUrl(): string | null {
  const explicit = process.env.MP_NOTIFICATION_URL?.trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (!isPublicNotificationHost(parsed.hostname)) return null;
      return explicit.replace(/\/$/, "");
    } catch {
      return null;
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!baseUrl) return null;

  try {
    const parsed = new URL(baseUrl);
    if (!isPublicNotificationHost(parsed.hostname)) return null;
  } catch {
    return null;
  }

  return `${baseUrl}/api/webhooks/mercadopago`;
}

export function getConfiguredMaxInterestFreeInstallments() {
  return Number(
    process.env.MP_MAX_INTEREST_FREE_INSTALLMENTS ?? ANNUAL_FEE_INSTALLMENTS ?? "12"
  );
}

export function getDifferentialPricingId() {
  const raw = process.env.MP_DIFFERENTIAL_PRICING_ID;
  if (raw === "false" || raw === "0") return undefined;
  if (!raw) return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 1;
}

export function isEvenSellerInstallment(amount: number, installments: number) {
  if (installments <= 1) return true;
  const installmentAmount = amount / installments;
  return (
    Number.isFinite(installmentAmount) &&
    installmentAmount >= 0.01 &&
    Math.abs(installmentAmount * installments - amount) < 0.02
  );
}

export async function createCardCheckoutPreference(input: {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  maxInstallments: number;
}) {
  const preferenceClient = new Preference(getClient());
  const differentialPricingId = getDifferentialPricingId();

  const body: Record<string, unknown> = {
    items: [
      {
        id: input.externalReference,
        title: input.description,
        quantity: 1,
        unit_price: input.amount,
        currency_id: "BRL",
      },
    ],
    payer: { email: input.payerEmail },
    external_reference: input.externalReference,
    payment_methods: {
      installments: input.maxInstallments,
      default_installments: 1,
      excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }],
    },
  };

  // Differential pricing só faz sentido quando há parcelamento; em 1x (à vista)
  // omitimos para o Brick não oferecer parcelas da conta MP.
  if (differentialPricingId && input.maxInstallments > 1) {
    body.differential_pricing = { id: differentialPricingId };
  }

  const result = await preferenceClient.create({ body: body as never });
  if (!result.id) {
    throw new Error("Não foi possível preparar o parcelamento no Mercado Pago");
  }

  return result.id;
}

export async function fetchMercadoPagoInstallmentPlans(input: {
  amount: number;
  paymentMethodId: string;
  bin: string;
  issuerId?: number;
}) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Access token do Mercado Pago não configurado");
  }

  const url = new URL("https://api.mercadopago.com/v1/payment_methods/installments");
  url.searchParams.set("amount", input.amount.toFixed(2));
  url.searchParams.set("payment_method_id", input.paymentMethodId);
  url.searchParams.set("bin", input.bin);
  if (input.issuerId) {
    url.searchParams.set("issuer.id", String(input.issuerId));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Não foi possível consultar as parcelas no Mercado Pago");
  }

  return (await response.json()) as MercadoPagoInstallmentPlan[];
}

export function getInterestFreeInstallmentCosts(
  plans: MercadoPagoInstallmentPlan[],
  amount: number
) {
  return plans
    .flatMap((plan) => plan.payer_costs ?? [])
    .filter(
      (cost) =>
        cost.installment_rate === 0 && Math.abs(cost.total_amount - amount) < 0.01
    )
    .sort((a, b) => a.installments - b.installments);
}

export async function getMaxInterestFreeInstallments(amount: number) {
  const configured = getConfiguredMaxInterestFreeInstallments();

  if (!getDifferentialPricingId()) {
    try {
      const plans = await fetchMercadoPagoInstallmentPlans({
        amount,
        paymentMethodId: "master",
        bin: "503143",
      });
      const interestFree = getInterestFreeInstallmentCosts(plans, amount);
      return interestFree.at(-1)?.installments ?? 1;
    } catch {
      return 1;
    }
  }

  return configured;
}

function getMercadoPagoErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      cause?: Array<{ description?: string }>;
    };
    const description = candidate.cause?.find((item) => item.description)?.description;
    const message = description ?? candidate.message ?? "";

    if (/Unauthorized use of live credentials/i.test(message)) {
      if (!usesMercadoPagoTestCredentials()) {
        return [
          "Cartão de teste (5031 4332 1540 6351) não funciona com Credenciais de produção.",
          "Para testar localmente, use a aba Credenciais de teste em Suas integrações e configure:",
          "MP_ACCESS_TOKEN_TEST, MP_PUBLIC_KEY_TEST e NEXT_PUBLIC_MP_PUBLIC_KEY_TEST (mesmo par).",
          "Mantenha MP_ENV=test, reinicie o servidor e use titular APRO.",
        ].join(" ");
      }

      return [
        "Par de credenciais incompatível com cartão de teste.",
        "Use Credenciais de teste da sua integração (aba Teste), não as do usuário de teste.",
        "Confira se Public Key e Access Token são do mesmo par e reinicie o servidor.",
        "No checkout, use um e-mail diferente do seu login no Mercado Pago.",
      ].join(" ");
    }

    if (description) return description;
    if (candidate.message) return candidate.message;
  }

  return "Erro ao processar pagamento no Mercado Pago.";
}

export async function resolveSellerInstallmentOption(input: {
  amount: number;
  installments: number;
  paymentMethodId: string;
  bin: string;
  issuerId?: number;
  paymentMethodOptionId?: string;
}) {
  const differentialPricingId = getDifferentialPricingId();
  const plans = await fetchMercadoPagoInstallmentPlans(input);
  const payerCosts = plans.flatMap((plan) => plan.payer_costs ?? []);
  const interestFreeCosts = getInterestFreeInstallmentCosts(plans, input.amount);

  const matchesInterestFree = (cost: MercadoPagoPayerCost) =>
    cost.installment_rate === 0 && Math.abs(cost.total_amount - input.amount) < 0.01;

  if (input.paymentMethodOptionId) {
    const selected = payerCosts.find(
      (cost) => cost.payment_method_option_id === input.paymentMethodOptionId
    );
    if (selected && matchesInterestFree(selected)) {
      return selected;
    }
    if (selected && differentialPricingId && isEvenSellerInstallment(input.amount, input.installments)) {
      return selected;
    }
    if (selected && !matchesInterestFree(selected)) {
      throw new Error(
        "Parcelamento com juros não é permitido. Escolha uma opção sem acréscimo."
      );
    }
  }

  const interestFree =
    interestFreeCosts.find((cost) => cost.installments === input.installments) ??
    payerCosts.find(
      (cost) => cost.installments === input.installments && matchesInterestFree(cost)
    );

  if (interestFree) {
    return interestFree;
  }

  if (differentialPricingId && isEvenSellerInstallment(input.amount, input.installments)) {
    const installmentAmount = input.amount / input.installments;
    return {
      installments: input.installments,
      installment_rate: 0,
      installment_amount: installmentAmount,
      total_amount: input.amount,
      payment_method_option_id: input.paymentMethodOptionId ?? "",
    };
  }

  const maxInstallments = interestFreeCosts.at(-1)?.installments ?? 1;
  if (maxInstallments <= 1) {
    throw new Error(
      "No momento só é possível pagar em 1x no cartão. Confirme o Parcelado Vendedor em Seu negócio > Taxas e parcelas > Checkout."
    );
  }

  throw new Error(
    `Parcelamento sem juros disponível apenas até ${maxInstallments}x para este valor.`
  );
}

export async function createMercadoPagoPayment(
  body: Record<string, unknown>,
  options?: { idempotencyKey?: string }
) {
  try {
    const paymentClient = new Payment(getClient());
    const result = await paymentClient.create({
      body: body as never,
      requestOptions: options?.idempotencyKey
        ? { idempotencyKey: options.idempotencyKey }
        : undefined,
    });
    return result;
  } catch (error) {
    throw new Error(getMercadoPagoErrorMessage(error));
  }
}

export async function getMercadoPagoPayment(providerPaymentId: string | number) {
  const paymentClient = new Payment(getClient());
  return paymentClient.get({ id: providerPaymentId });
}

export function isMercadoPagoPaymentApproved(status?: string | null) {
  return status === "approved";
}

export function isMercadoPagoPaymentPending(status?: string | null) {
  return status === "pending" || status === "in_process" || status === "authorized";
}
