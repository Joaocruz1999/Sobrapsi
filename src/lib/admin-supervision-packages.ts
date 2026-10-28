import "server-only";

import type { SupervisionPackageStatus } from "@prisma/client";
import { resolveAuditActorUserId } from "@/lib/audit";
import { formatCpfForDisplay } from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import { SUPERVISION_PACKAGE_TYPE } from "@/lib/supervision-package-shared";
import {
  SUPERVISION_PACKAGE_STATUS_LABELS,
  SUPERVISION_PACKAGE_UPDATABLE_STATUSES,
  type SupervisionPackageUpdatableStatus,
} from "@/lib/supervision-package-kanban";

const KANBAN_STATUSES: SupervisionPackageStatus[] = [
  "draft",
  "received",
  "awaiting_payment",
];

function dueDateInSevenDays() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/** Cria pedidos a partir de pagamentos órfãos (antes do modelo de order). */
export async function backfillSupervisionPackageOrdersFromPayments() {
  const payments = await prisma.payment.findMany({
    where: {
      type: SUPERVISION_PACKAGE_TYPE,
      status: { in: ["pending", "paid"] },
      supervisionPackageOrder: null,
    },
    include: {
      user: { include: { person: true, member: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  for (const payment of payments) {
    const fullName =
      payment.user.person?.fullName?.trim() ||
      payment.user.email ||
      "Comprador";
    await prisma.supervisionPackageOrder.create({
      data: {
        userId: payment.userId,
        memberId: payment.memberId,
        paymentId: payment.id,
        status: payment.status === "paid" ? "paid" : "awaiting_payment",
        claimsMember: Boolean(payment.memberId),
        isMemberPrice: Boolean(payment.memberId),
        amount: payment.amount,
        fullName,
        phone: payment.user.person?.phone ?? null,
        submittedAt: payment.createdAt,
        paidAt: payment.paidAt,
      },
    });
  }
}

export async function listSupervisionPackageOrdersForKanban() {
  await backfillSupervisionPackageOrdersFromPayments();

  const orders = await prisma.supervisionPackageOrder.findMany({
    where: { status: { in: KANBAN_STATUSES } },
    include: {
      user: { include: { person: true, member: true } },
      payment: true,
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    statusLabel: SUPERVISION_PACKAGE_STATUS_LABELS[order.status] ?? order.status,
    fullName: order.fullName,
    phone: order.phone,
    email: order.user.person?.email ?? order.user.email,
    cpf: formatCpfForDisplay(order.user.person?.cpfEncrypted ?? null),
    amount: Number(order.amount),
    isMemberPrice: order.isMemberPrice,
    claimsMember: order.claimsMember,
    paymentId: order.paymentId,
    paymentStatus: order.payment?.status ?? null,
    dueDate: order.payment?.dueDate ?? null,
    submittedAt: order.submittedAt?.toISOString() ?? order.createdAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    registrationNumber: order.user.member?.registrationNumber ?? null,
  }));
}

export async function getSupervisionPackageOrderDetail(orderId: string) {
  const order = await prisma.supervisionPackageOrder.findUnique({
    where: { id: orderId },
    include: {
      user: { include: { person: true, member: true } },
      payment: true,
    },
  });
  if (!order) throw new Error("Pedido não encontrado");

  return {
    id: order.id,
    status: order.status,
    statusLabel: SUPERVISION_PACKAGE_STATUS_LABELS[order.status] ?? order.status,
    fullName: order.fullName,
    phone: order.phone,
    email: order.user.person?.email ?? order.user.email,
    cpf: formatCpfForDisplay(order.user.person?.cpfEncrypted ?? null),
    amount: Number(order.amount),
    isMemberPrice: order.isMemberPrice,
    claimsMember: order.claimsMember,
    paymentId: order.paymentId,
    paymentStatus: order.payment?.status ?? null,
    dueDate: order.payment?.dueDate?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? order.payment?.paidAt?.toISOString() ?? null,
    submittedAt: order.submittedAt?.toISOString() ?? order.createdAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    registrationNumber: order.user.member?.registrationNumber ?? null,
  };
}

async function ensurePendingPaymentForOrder(orderId: string) {
  const order = await prisma.supervisionPackageOrder.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });
  if (!order) throw new Error("Pedido não encontrado");
  if (order.status === "paid") throw new Error("Pedido já está pago");

  if (order.payment && order.payment.status === "pending") {
    const updatedPayment = await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        amount: order.amount,
        memberId: order.memberId,
        dueDate: dueDateInSevenDays(),
      },
    });
    return updatedPayment;
  }

  if (order.paymentId && order.payment?.status === "paid") {
    throw new Error("Já existe pagamento confirmado para este pedido");
  }

  const payment = await prisma.payment.create({
    data: {
      userId: order.userId,
      memberId: order.memberId,
      type: SUPERVISION_PACKAGE_TYPE,
      provider: "mercadopago",
      amount: order.amount,
      status: "pending",
      dueDate: dueDateInSevenDays(),
    },
  });

  await prisma.supervisionPackageOrder.update({
    where: { id: order.id },
    data: { paymentId: payment.id },
  });

  return payment;
}

export async function updateSupervisionPackageOrderStatus(
  orderId: string,
  status: string,
  actorId?: string
) {
  if (
    !SUPERVISION_PACKAGE_UPDATABLE_STATUSES.includes(
      status as SupervisionPackageUpdatableStatus
    )
  ) {
    throw new Error("Status inválido");
  }

  const order = await prisma.supervisionPackageOrder.findUnique({
    where: { id: orderId },
  });
  if (!order) throw new Error("Pedido não encontrado");

  const nextStatus = status as SupervisionPackageStatus;

  if (nextStatus === "awaiting_payment") {
    await ensurePendingPaymentForOrder(orderId);
  }

  const updated = await prisma.supervisionPackageOrder.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      submittedAt:
        nextStatus === "draft"
          ? order.submittedAt
          : order.submittedAt ?? new Date(),
      paidAt: nextStatus === "paid" ? order.paidAt ?? new Date() : order.paidAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: resolveAuditActorUserId(actorId),
      action: "supervision_package.status_updated",
      entityType: "supervision_package_order",
      entityId: orderId,
      beforeJson: JSON.stringify({ status: order.status }),
      afterJson: JSON.stringify({ status: nextStatus }),
    },
  });

  return updated;
}

export async function markSupervisionPackageOrderPaidByPaymentId(paymentId: string) {
  const order = await prisma.supervisionPackageOrder.findFirst({
    where: { paymentId },
  });
  if (!order) return null;
  if (order.status === "paid") return order;

  return prisma.supervisionPackageOrder.update({
    where: { id: order.id },
    data: {
      status: "paid",
      paidAt: new Date(),
    },
  });
}
