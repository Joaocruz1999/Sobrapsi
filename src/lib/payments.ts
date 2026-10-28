import "server-only";

import { getSession } from "@/lib/auth";
import { getTrackingSession } from "@/lib/candidate-tracking-auth";
import { ANNUAL_FEE_CARD_AMOUNT } from "@/lib/constants";
import { finalizeApplicationApproval } from "@/lib/applications";
import { resolveAuditActorUserId } from "@/lib/audit";
import { sendPaymentConfirmedEmail, sendRenewalConfirmedEmail } from "@/lib/email";
import { renewMembership } from "@/lib/membership-status";
import { getPurchaseSession } from "@/lib/purchase-auth";
import {
  createCardCheckoutPreference,
  createMercadoPagoPayment,
  getDifferentialPricingId,
  getMaxInterestFreeInstallments,
  getMercadoPagoPayment,
  getMercadoPagoPublicKey,
  getWebhookUrl,
  isMercadoPagoConfigured,
  isMercadoPagoPaymentApproved,
  isMercadoPagoPaymentPending,
  resolveSellerInstallmentOption,
} from "@/lib/mercadopago";
import {
  getCheckoutAmount,
  getCheckoutPricingOptions,
  getPaymentDescription,
  type CheckoutPricingMethod,
} from "@/lib/payment-pricing";
import { prisma } from "@/lib/prisma";

export {
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/payment-shared";

export async function createRenewalPayment(userId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, userId },
  });

  if (!member) throw new Error("Associado não encontrado");

  const existing = await prisma.payment.findFirst({
    where: {
      memberId,
      type: "annual_fee",
      status: "pending",
    },
  });

  if (existing) return existing;

  const dueDate = member.validUntil ?? new Date();

  return prisma.payment.create({
    data: {
      userId,
      memberId,
      type: "annual_fee",
      provider: "mercadopago",
      amount: ANNUAL_FEE_CARD_AMOUNT,
      status: "pending",
      dueDate,
    },
  });
}

export async function getMemberPayments(userId: string, memberId: string) {
  return prisma.payment.findMany({
    where: { userId, memberId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getPendingPayments() {
  return prisma.payment.findMany({
    where: { status: "pending" },
    include: {
      user: { include: { person: true } },
      member: true,
      application: { include: { candidate: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentlyPaidPayments(limit = 15) {
  return prisma.payment.findMany({
    where: { status: "paid" },
    include: {
      user: { include: { person: true } },
      member: true,
      application: { include: { candidate: true } },
    },
    orderBy: { paidAt: "desc" },
    take: limit,
  });
}

export async function confirmPayment(
  paymentId: string,
  actorId?: string,
  providerPaymentId?: string
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: { include: { person: true } },
      member: true,
      application: { include: { candidate: true } },
    },
  });

  if (!payment) throw new Error("Pagamento não encontrado");
  if (payment.status === "paid") throw new Error("Pagamento já confirmado");

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "paid",
        paidAt: new Date(),
        providerPaymentId: providerPaymentId ?? `manual-${Date.now()}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: resolveAuditActorUserId(actorId),
        action: "payment.confirmed",
        entityType: "payment",
        entityId: paymentId,
        afterJson: JSON.stringify({ type: payment.type, amount: payment.amount }),
      },
    });

    return p;
  });

  const email = payment.user.person?.email ?? payment.user.email;
  const name = payment.user.person?.fullName ?? "Associado";

  if (payment.type === "application_fee" && payment.applicationId) {
    const existingMember = await prisma.member.findFirst({
      where: { applicationId: payment.applicationId },
    });
    if (!existingMember) {
      await finalizeApplicationApproval(
        payment.applicationId,
        actorId ?? "admin"
      );
    }
  } else if (payment.type === "annual_fee" && payment.memberId) {
    await renewMembership(payment.memberId);
    await sendRenewalConfirmedEmail(email, name, payment.member?.registrationNumber ?? "");
  } else {
    if (payment.type === "supervision_package") {
      const { markSupervisionPackageOrderPaidByPaymentId } = await import(
        "@/lib/admin-supervision-packages"
      );
      await markSupervisionPackageOrderPaidByPaymentId(paymentId);
    }
    await sendPaymentConfirmedEmail(email, name, Number(payment.amount));
  }

  return updated;
}

export async function simulatePayment(paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId, status: "pending" },
  });

  if (!payment) throw new Error("Pagamento não encontrado");

  // Em produção, redirecionaria para gateway. Em dev, simula confirmação imediata.
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SIMULATED_PAYMENTS) {
    throw new Error("Pagamento simulado desabilitado em produção");
  }

  return confirmPayment(paymentId, userId, `sim-${Date.now()}`);
}

export async function authorizePaymentAccess(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: { include: { person: true } },
      application: { include: { candidate: true } },
    },
  });

  if (!payment || payment.status !== "pending") {
    throw new Error("Pagamento não encontrado ou indisponível");
  }

  const session = await getSession();
  if (session?.userId === payment.userId) {
    return payment;
  }

  const trackingSession = await getTrackingSession();
  if (trackingSession?.applicationId && payment.applicationId === trackingSession.applicationId) {
    return payment;
  }

  const purchaseSession = await getPurchaseSession();
  if (purchaseSession?.paymentId === payment.id) {
    return payment;
  }

  throw new Error("Não autorizado");
}

export async function getPaymentCheckoutConfig(paymentId: string) {
  const payment = await authorizePaymentAccess(paymentId);

  if (!isMercadoPagoConfigured()) {
    throw new Error("Mercado Pago não configurado");
  }

  const payerEmail =
    payment.user.person?.email ??
    payment.application?.candidate?.email ??
    payment.user.email;

  const amountOverride =
    payment.type === "supervision_package" ? Number(payment.amount) : undefined;
  const pricingOptions = getCheckoutPricingOptions(payment.type, amountOverride);
  const cardOption = pricingOptions.find((option) => option.method === "card");
  const allowedInstallments = cardOption?.installments ?? 1;
  const interestFreeCap = cardOption
    ? await getMaxInterestFreeInstallments(cardOption.amount)
    : 1;
  // Produtos à vista (ex.: grupo de supervisões) ficam em 1x mesmo se a conta MP
  // oferecer mais parcelas sem juros.
  const maxInterestFreeInstallments = Math.min(allowedInstallments, interestFreeCap);
  const preferenceId = cardOption
    ? await createCardCheckoutPreference({
        amount: cardOption.amount,
        description: getPaymentDescription(payment.type),
        externalReference: payment.id,
        payerEmail,
        maxInstallments: maxInterestFreeInstallments,
      })
    : undefined;

  return {
    publicKey: getMercadoPagoPublicKey(),
    paymentId: payment.id,
    paymentType: payment.type,
    payerEmail,
    description: getPaymentDescription(payment.type),
    options: pricingOptions,
    preferenceId,
    maxInterestFreeInstallments,
  };
}

interface ProcessMercadoPagoInput {
  paymentId: string;
  pricingMethod: CheckoutPricingMethod;
  formData: Record<string, unknown>;
  cardBin?: string;
}

export async function processMercadoPagoCheckout({
  paymentId,
  pricingMethod,
  formData,
  cardBin,
}: ProcessMercadoPagoInput) {
  const payment = await authorizePaymentAccess(paymentId);
  const amountOverride =
    payment.type === "supervision_package" ? Number(payment.amount) : undefined;
  const pricing = getCheckoutAmount(payment.type, pricingMethod, amountOverride);
  const payerEmail =
    payment.user.person?.email ??
    payment.application?.candidate?.email ??
    payment.user.email;

  const payer = (formData.payer ?? {}) as {
    email?: string;
    first_name?: string;
    identification?: { type?: string; number?: string };
  };

  const body: Record<string, unknown> = {
    transaction_amount: pricing.amount,
    description: getPaymentDescription(payment.type),
    payment_method_id: String(formData.payment_method_id ?? ""),
    payer: {
      email: payer.email ?? payerEmail,
      first_name: payer.first_name ?? payment.user.person?.fullName ?? "Associado",
      identification: payer.identification,
    },
    external_reference: payment.id,
    metadata: {
      sobrapsi_payment_id: payment.id,
      pricing_method: pricingMethod,
    },
  };

  const notificationUrl = getWebhookUrl();
  if (notificationUrl) {
    body.notification_url = notificationUrl;
  }

  if (formData.token) {
    body.token = String(formData.token);
  }

  if (formData.issuer_id) {
    body.issuer_id = Number(formData.issuer_id);
  }

  if (pricingMethod === "card") {
    if (!payer.identification?.number) {
      throw new Error("Informe o CPF do titular do cartão.");
    }

    const maxAllowedInstallments = pricing.installments ?? 1;
    const requestedInstallments = Number(formData.installments ?? maxAllowedInstallments);
    if (
      !Number.isFinite(requestedInstallments) ||
      requestedInstallments < 1 ||
      requestedInstallments > maxAllowedInstallments
    ) {
      throw new Error(
        maxAllowedInstallments <= 1
          ? "Este produto aceita apenas pagamento à vista no cartão."
          : `Parcelamento disponível apenas até ${maxAllowedInstallments}x.`
      );
    }

    const installments = requestedInstallments;
    body.installments = installments;

    if (installments > 1) {
      const paymentMethodId = String(formData.payment_method_id ?? "");
      const issuerId = formData.issuer_id ? Number(formData.issuer_id) : undefined;
      const bin =
        cardBin ??
        String(formData.bin ?? formData.first_six_digits ?? "").replace(/\D/g, "").slice(0, 6);

      if (!paymentMethodId || bin.length < 6) {
        throw new Error("Não foi possível validar o parcelamento do cartão.");
      }

      const installmentOption = await resolveSellerInstallmentOption({
        amount: pricing.amount,
        installments,
        paymentMethodId,
        bin,
        issuerId,
        paymentMethodOptionId: formData.payment_method_option_id
          ? String(formData.payment_method_option_id)
          : undefined,
      });

      if (installmentOption.payment_method_option_id) {
        body.payment_method_option_id = installmentOption.payment_method_option_id;
      }
    }
  }

  const differentialPricingId = getDifferentialPricingId();
  if (
    differentialPricingId &&
    pricingMethod === "card" &&
    (pricing.installments ?? 1) > 1
  ) {
    body.differential_pricing_id = differentialPricingId;
  }

  const providerPayment = await createMercadoPagoPayment(body, {
    idempotencyKey: payment.id,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      provider: "mercadopago",
      providerPaymentId: String(providerPayment.id),
      amount: pricing.amount,
    },
  });

  if (isMercadoPagoPaymentApproved(providerPayment.status)) {
    await confirmPayment(payment.id, payment.userId, String(providerPayment.id));
  }

  return {
    providerPaymentId: providerPayment.id,
    status: providerPayment.status,
    statusDetail: providerPayment.status_detail,
    approved: isMercadoPagoPaymentApproved(providerPayment.status),
    pending: isMercadoPagoPaymentPending(providerPayment.status),
    pix:
      providerPayment.point_of_interaction?.transaction_data?.qr_code ||
      providerPayment.point_of_interaction?.transaction_data?.ticket_url
        ? {
            qrCode: providerPayment.point_of_interaction?.transaction_data?.qr_code ?? null,
            qrCodeBase64:
              providerPayment.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
            ticketUrl:
              providerPayment.point_of_interaction?.transaction_data?.ticket_url ?? null,
          }
        : null,
  };
}

export async function syncMercadoPagoProviderPayment(providerPaymentId: string | number) {
  const providerPayment = await getMercadoPagoPayment(providerPaymentId);
  const paymentId = providerPayment.external_reference;

  if (!paymentId) {
    throw new Error("Pagamento sem referência externa");
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new Error("Pagamento interno não encontrado");
  }

  if (payment.status === "paid") {
    return payment;
  }

  if (isMercadoPagoPaymentApproved(providerPayment.status)) {
    return confirmPayment(payment.id, payment.userId, String(providerPayment.id));
  }

  if (providerPayment.id) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "mercadopago",
        providerPaymentId: String(providerPayment.id),
      },
    });
  }

  return payment;
}

