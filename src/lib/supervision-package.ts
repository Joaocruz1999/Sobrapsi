import "server-only";

import { isValidCpf, normalizeCpf } from "@/lib/application-shared";
import { prepareCpfForStorage } from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import { createPurchaseSession } from "@/lib/purchase-auth";
import {
  getSupervisionPackageAmount,
  SUPERVISION_PACKAGE_TYPE,
} from "@/lib/supervision-package-shared";
import { getUserByCpf } from "@/lib/users";

export {
  getSupervisionPackageAmount,
  SUPERVISION_PACKAGE,
  SUPERVISION_PACKAGE_GUEST_AMOUNT,
  SUPERVISION_PACKAGE_MEMBER_AMOUNT,
  SUPERVISION_PACKAGE_TYPE,
} from "@/lib/supervision-package-shared";

const MEMBER_STATUSES = new Set([
  "active",
  "expiring",
  "expired",
  "suspended",
  "honorary",
]);

function guestCheckoutEmail(normalizedCpf: string) {
  return `cpf.${normalizedCpf}@compra.sobrapsi.local`;
}

function dueDateInSevenDays() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function isActiveSobrapsiMember(member: { status: string } | null | undefined) {
  return !!member && MEMBER_STATUSES.has(member.status);
}

export async function resolveMembershipByCpf(cpf: string) {
  const normalized = normalizeCpf(cpf);
  if (!isValidCpf(normalized)) {
    throw new Error("Informe um CPF válido.");
  }

  const user = await getUserByCpf(normalized);
  const isMember = isActiveSobrapsiMember(user?.member ?? null);

  return {
    cpf: normalized,
    user,
    isMember,
    memberId: user?.member?.id ?? null,
  };
}

export async function validateSupervisionPackageClaim(input: {
  cpf: string;
  claimsMember: boolean;
}) {
  const resolved = await resolveMembershipByCpf(input.cpf);

  if (input.claimsMember && !resolved.isMember) {
    throw new Error(
      "Não encontramos associação para este CPF. Confirme o CPF cadastrado ou selecione “Não sou associado”."
    );
  }

  if (!input.claimsMember && resolved.isMember) {
    throw new Error(
      "Este CPF pertence a um associado SOBRAPSI. Selecione “Sou associado” para o valor de R$ 200."
    );
  }

  return resolved;
}

export async function createSupervisionPackagePayment(input: {
  fullName: string;
  cpf: string;
  phone: string;
  claimsMember: boolean;
}) {
  const fullName = input.fullName.trim();
  if (fullName.length < 3) {
    throw new Error("Informe o nome completo.");
  }

  const phone = input.phone.replace(/\D/g, "");
  if (phone.length < 10) {
    throw new Error("Informe um telefone válido com DDD.");
  }

  const resolved = await validateSupervisionPackageClaim({
    cpf: input.cpf,
    claimsMember: input.claimsMember,
  });

  const amount = getSupervisionPackageAmount(resolved.isMember);
  const { cpfEncrypted, cpfHash } = prepareCpfForStorage(resolved.cpf);
  const checkoutEmail =
    resolved.user?.person?.email?.trim() ||
    resolved.user?.email?.trim() ||
    guestCheckoutEmail(resolved.cpf);

  let userId = resolved.user?.id;

  if (!userId) {
    const created = await prisma.user.create({
      data: {
        email: checkoutEmail,
        role: "candidate",
        person: {
          create: {
            fullName,
            email: checkoutEmail,
            phone,
            cpfEncrypted,
            cpfHash,
          },
        },
      },
    });
    userId = created.id;
  } else {
    await prisma.person.upsert({
      where: { userId },
      create: {
        userId,
        fullName,
        email: checkoutEmail,
        phone,
        cpfEncrypted,
        cpfHash,
      },
      update: {
        fullName,
        phone,
        cpfEncrypted,
        cpfHash,
      },
    });
  }

  const openOrder = await prisma.supervisionPackageOrder.findFirst({
    where: {
      userId,
      status: { in: ["draft", "received", "awaiting_payment"] },
    },
    include: { payment: true },
    orderBy: { createdAt: "desc" },
  });

  let payment =
    openOrder?.payment && openOrder.payment.status === "pending"
      ? openOrder.payment
      : null;

  if (payment) {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amount,
        memberId: resolved.memberId,
        dueDate: dueDateInSevenDays(),
      },
    });
  } else {
    payment = await prisma.payment.create({
      data: {
        userId,
        memberId: resolved.memberId,
        type: SUPERVISION_PACKAGE_TYPE,
        provider: "mercadopago",
        amount,
        status: "pending",
        dueDate: dueDateInSevenDays(),
      },
    });
  }

  const orderData = {
    memberId: resolved.memberId,
    paymentId: payment.id,
    status: "awaiting_payment" as const,
    claimsMember: input.claimsMember,
    isMemberPrice: resolved.isMember,
    amount,
    fullName,
    phone,
    submittedAt: new Date(),
  };

  if (openOrder) {
    await prisma.supervisionPackageOrder.update({
      where: { id: openOrder.id },
      data: orderData,
    });
  } else {
    await prisma.supervisionPackageOrder.create({
      data: {
        userId,
        ...orderData,
      },
    });
  }

  await createPurchaseSession(payment.id);

  return {
    payment,
    amount,
    isMember: resolved.isMember,
  };
}
