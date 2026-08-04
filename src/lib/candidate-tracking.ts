import "server-only";

import { prisma } from "@/lib/prisma";
import {
  birthYearMatches,
  getCandidateStatusLabel,
  getTrackingStepStates,
  normalizeCpf,
  resolveCandidateTrackingStep,
} from "@/lib/application-shared";
import { hashCpf } from "@/lib/crypto";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export async function findApplicationByCpfAndBirthYear(cpf: string, birthYear: number) {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11 || !Number.isInteger(birthYear)) {
    return null;
  }

  const cpfHash = hashCpf(normalized);

  const applications = await prisma.application.findMany({
    where: {
      status: { not: "draft" },
      OR: [
        { candidate: { isNot: null } },
        { user: { person: { isNot: null } } },
      ],
    },
    include: {
      candidate: true,
      user: { include: { person: true } },
      payments: { orderBy: { createdAt: "desc" } },
      member: true,
      adminNotes: {
        where: { visibility: "candidate" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return (
    applications.find((app) => {
      const storedHash =
        app.candidate?.cpfHash ?? app.user?.person?.cpfHash ?? null;
      const birthDate =
        app.candidate?.birthDate ?? app.user?.person?.birthDate ?? null;
      return storedHash === cpfHash && birthYearMatches(birthDate, birthYear);
    }) ?? null
  );
}

export function buildTrackingView(application: NonNullable<Awaited<ReturnType<typeof findApplicationByCpfAndBirthYear>>>) {
  const candidateName =
    application.candidate?.fullName ??
    application.user?.person?.fullName ??
    "Candidato";

  const trackingInput = {
    status: application.status,
    payments: application.payments,
    hasMember: Boolean(application.member),
  };

  const currentStep = resolveCandidateTrackingStep(trackingInput);
  const applicationPayment = application.payments.find((p) => p.type === "application_fee");

  return {
    id: application.id,
    candidateName,
    category: application.categoryRequested,
    categoryLabel: CATEGORY_LABELS[application.categoryRequested],
    status: application.status,
    statusLabel: getCandidateStatusLabel(trackingInput),
    currentStep,
    steps: getTrackingStepStates(currentStep),
    submittedAt: application.submittedAt,
    submittedAtLabel: formatDate(application.submittedAt),
    isRejected: application.status === "rejected",
    isCancelled: application.status === "cancelled_by_candidate",
    rejectionReason: application.decisionReasonPublic,
    complementNotes: application.adminNotes.map((n) => ({
      id: n.id,
      note: n.note,
      createdAt: formatDate(n.createdAt),
    })),
    showPaymentPending: currentStep === "approved_pending_payment",
    payment: applicationPayment
      ? {
          id: applicationPayment.id,
          amount: Number(applicationPayment.amount),
          status: applicationPayment.status,
          dueDate: formatDate(applicationPayment.dueDate),
        }
      : null,
    registrationNumber:
      application.status === "approved"
        ? application.member?.registrationNumber ?? null
        : null,
    canResumeCandidature: ["awaiting_complement", "draft"].includes(application.status),
  };
}

export async function getTrackingForSession(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: true,
      user: { include: { person: true } },
      payments: { orderBy: { createdAt: "desc" } },
      member: true,
      adminNotes: {
        where: { visibility: "candidate" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!application || application.status === "draft") return null;
  return buildTrackingView(application);
}
