import "server-only";

import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatRegistrationNumber } from "@/lib/utils";
import { randomBytes } from "crypto";
import path from "path";
import { unlink } from "fs/promises";
import { generateMembershipCardPdf } from "@/lib/membership-card";
import {
  sendMemberApprovedAccountEmail,
  sendApplicationApprovedPendingPaymentEmail,
  sendComplementRequestEmail,
} from "@/lib/email";
import { applicationInclude } from "@/lib/application-guest";
import { APPLICATION_FEE_CARD_AMOUNT, CATEGORY_LABELS } from "@/lib/constants";
import { resolveAuditActorUserId, resolvePortalAdminAuthorId } from "@/lib/audit";
import {
  formatBirthDateAsPassword,
  formatCpfInput,
} from "@/lib/application-shared";
import {
  buildEducationSummaryFromRecords,
  buildProfessionalSummaryFromCandidate,
} from "@/lib/public-profile-defaults";
import { hashPassword } from "@/lib/users";
import { isStaffRole } from "@/lib/staff-permissions";
import { cleanupStaffUserApplications } from "@/lib/application-duplicates";
import { readCpf } from "@/lib/pii";

export {
  APPLICATION_STATUS_LABELS,
  DOCUMENT_TYPES,
  requiredDocumentsForCategory,
} from "@/lib/application-shared";

export async function getOrCreateDraftApplication(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { member: true },
  });

  if (!user) return null;

  if (isStaffRole(user.role)) {
    await cleanupStaffUserApplications(userId);
    return null;
  }

  const include = {
    ...applicationInclude,
    user: { include: { person: true } },
  };

  if (user?.member) {
    const linked = user.member.applicationId
      ? await prisma.application.findUnique({
          where: { id: user.member.applicationId },
          include,
        })
      : null;

    if (linked) return linked;

    const approved = await prisma.application.findFirst({
      where: { userId, status: "approved" },
      include,
      orderBy: { updatedAt: "desc" },
    });
    if (approved) return approved;
  }

  const existingApproved = await prisma.application.findFirst({
    where: { userId, status: "approved" },
    include,
    orderBy: { updatedAt: "desc" },
  });
  if (existingApproved) return existingApproved;

  const existing = await prisma.application.findFirst({
    where: {
      userId,
      status: { in: ["draft", "awaiting_complement"] },
    },
    include,
    orderBy: { updatedAt: "desc" },
  });

  if (existing) return existing;

  return prisma.application.create({
    data: {
      userId,
      categoryRequested: "student",
      status: "draft",
      currentStep: 1,
    },
    include,
  });
}

export async function getPortalApplicationForUser(userId: string) {
  const { cleanupOrphanDraftApplications } = await import("@/lib/application-duplicates");
  await cleanupOrphanDraftApplications(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { member: true },
  });

  if (!user) return null;

  if (isStaffRole(user.role)) {
    await cleanupStaffUserApplications(userId);
    return null;
  }

  const include = {
    ...applicationInclude,
    user: { include: { person: true } },
  };

  if (user?.member) {
    if (user.member.applicationId) {
      const linked = await prisma.application.findUnique({
        where: { id: user.member.applicationId },
        include,
      });
      if (linked) return linked;
    }

    return prisma.application.findFirst({
      where: { userId, status: "approved" },
      include,
      orderBy: { updatedAt: "desc" },
    });
  }

  return getOrCreateDraftApplication(userId);
}

export async function getApplicationForUser(userId: string, applicationId: string) {
  return prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      ...applicationInclude,
      user: { include: { person: true } },
    },
  });
}

export async function generateRegistrationNumber(): Promise<string> {
  const members = await prisma.member.findMany({
    where: { registrationNumber: { startsWith: "SBR-" } },
    select: { registrationNumber: true },
  });

  let maxSeq = 0;
  for (const member of members) {
    const match = member.registrationNumber.match(/^SBR-(\d{6})$/);
    if (match) {
      maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
      continue;
    }

    const legacy = member.registrationNumber.match(/^SBR-\d{4}-(\d+)$/);
    if (legacy) {
      maxSeq = Math.max(maxSeq, parseInt(legacy[1], 10));
    }
  }

  return formatRegistrationNumber(maxSeq + 1);
}

export function generateQrToken() {
  return randomBytes(24).toString("hex");
}

export async function processApplicationReceived(applicationId: string) {
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "awaiting_review" },
  });
}

async function ensureApplicationUser(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: { include: { person: true } },
      candidate: true,
    },
  });

  if (!application) throw new Error("Candidatura não encontrada");

  if (application.userId) {
    return {
      application,
      userId: application.userId,
      person: application.user?.person ?? null,
      userEmail: application.user?.email ?? application.candidate?.email ?? "",
    };
  }

  const candidate = application.candidate;
  if (!candidate?.email || !candidate.fullName) {
    throw new Error("Dados do candidato incompletos");
  }

  const email = candidate.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { userId: existing.id },
    });
    const person = await prisma.person.findUnique({ where: { userId: existing.id } });
    return {
      application: { ...application, userId: existing.id },
      userId: existing.id,
      person,
      userEmail: existing.email,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      role: "candidate",
      person: {
        create: {
          fullName: candidate.fullName,
          socialName: candidate.socialName,
          cpfEncrypted: candidate.cpfEncrypted,
          cpfHash: candidate.cpfHash,
          rgEncrypted: candidate.rgEncrypted,
          rgIssuer: candidate.rgIssuer,
          birthDate: candidate.birthDate,
          nationality: candidate.nationality,
          address: candidate.address,
          addressNumber: candidate.addressNumber,
          city: candidate.city,
          state: candidate.state,
          zipCode: candidate.zipCode,
          email: candidate.email,
          phone: candidate.phone,
          phoneAlt: candidate.phoneAlt,
          profession: candidate.profession,
          occupation: candidate.occupation,
          institution: candidate.institution,
          cnpj: candidate.cnpj,
          professionalWebsite: candidate.professionalWebsite,
          linkedin: candidate.linkedin,
          instagram: candidate.instagram,
          practiceCity: candidate.practiceCity,
          practiceModality: candidate.practiceModality,
          studyAreas: candidate.studyAreas,
          authorizePublicProfessional: candidate.authorizePublicProfessional,
        },
      },
    },
    include: { person: true },
  });

  await prisma.application.update({
    where: { id: applicationId },
    data: { userId: user.id },
  });

  const consents = await prisma.applicationConsent.findMany({
    where: { applicationId },
  });
  for (const consent of consents) {
    await prisma.consent.create({
      data: {
        userId: user.id,
        consentType: consent.consentType,
        version: consent.version,
      },
    });
  }

  return {
    application: { ...application, userId: user.id },
    userId: user.id,
    person: user.person,
    userEmail: user.email,
  };
}

export async function finalizeApplicationApproval(
  applicationId: string,
  reviewerId: string
) {
  await ensureApplicationUser(applicationId);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: { include: { person: true } },
      candidate: true,
      publicProfileDraft: true,
      educationRecords: { orderBy: { createdAt: "asc" } },
      curriculumRecord: true,
      member: true,
    },
  });

  if (!application) throw new Error("Candidatura não encontrada");
  if (application.member) {
    return prisma.member.findUniqueOrThrow({
      where: { id: application.member.id },
      include: { publicProfile: true, membershipCard: true, user: { include: { person: true } } },
    });
  }
  if (!application.userId) throw new Error("Usuário não vinculado à candidatura");

  const userId = application.userId;
  const person = application.user?.person ?? null;
  const candidate = application.candidate;
  const userEmail = application.user?.email ?? candidate?.email ?? "";
  const birthDate = person?.birthDate ?? candidate?.birthDate ?? null;
  const defaultPassword = formatBirthDateAsPassword(birthDate);

  if (!defaultPassword) {
    throw new Error("Data de nascimento obrigatória para criar a conta do associado");
  }

  const cpfRaw = readCpf(person?.cpfEncrypted ?? candidate?.cpfEncrypted ?? null);
  if (!cpfRaw) {
    throw new Error("CPF obrigatório para criar a conta do associado");
  }

  const passwordHash = await hashPassword(defaultPassword);
  const registrationNumber = await generateRegistrationNumber();
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const qrToken = generateQrToken();
  const draft = application.publicProfileDraft;
  const educationSummary = buildEducationSummaryFromRecords(application.educationRecords);
  const professionalSummary = buildProfessionalSummaryFromCandidate(candidate);

  const member = await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        reviewerId,
        decision: "approved",
        userId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: "member", passwordHash, mustChangePassword: true },
    });

    const newMember = await tx.member.create({
      data: {
        userId,
        applicationId,
        registrationNumber,
        category: application.categoryRequested,
        status: "active",
        approvedAt: new Date(),
        validUntil,
        publicProfile: {
          create: {
            publicName: draft?.publicName ?? person?.fullName ?? candidate?.fullName ?? "Associado",
            publicCity:
              draft?.publicCity ??
              candidate?.practiceCity ??
              person?.city ??
              candidate?.city,
            publicState: draft?.publicState ?? person?.state ?? candidate?.state,
            publicBio:
              draft?.publicBio ??
              application.curriculumRecord?.summary ??
              (professionalSummary || null),
            publicEducationSummary:
              draft?.publicEducationSummary ?? (educationSummary || null),
            publicStudyAreas: draft?.publicStudyAreas ?? candidate?.studyAreas,
            publicWebsite: draft?.publicWebsite ?? candidate?.professionalWebsite,
            publicLinkedin: draft?.publicLinkedin ?? candidate?.linkedin,
            publicInstagram: draft?.publicInstagram ?? candidate?.instagram,
            publishBio: draft?.authorizeBio ?? false,
            publishLinks: draft?.authorizeLinks ?? false,
            publishPhoto: draft?.authorizePhoto ?? false,
            publicPhotoUrl: draft?.profilePhotoPath ?? null,
            isPublic: draft?.authorizeList ?? false,
            reviewStatus: "approved",
          },
        },
        membershipCard: {
          create: {
            cardNumber: registrationNumber,
            qrToken,
            validUntil,
          },
        },
      },
      include: { publicProfile: true, membershipCard: true, user: { include: { person: true } } },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: resolveAuditActorUserId(reviewerId),
        action: "application.approved",
        entityType: "application",
        entityId: applicationId,
        afterJson: JSON.stringify({ registrationNumber }),
      },
    });

    return newMember;
  });

  const email = person?.email ?? candidate?.email ?? userEmail;
  const name = person?.fullName ?? candidate?.fullName ?? "Associado";

  await sendMemberApprovedAccountEmail(
    email,
    name,
    member.registrationNumber,
    CATEGORY_LABELS[member.category],
    formatCpfInput(cpfRaw),
    defaultPassword,
    validUntil
  );

  try {
    await generateMembershipCardPdf(member.id);
  } catch (err) {
    console.error("Erro ao gerar carteira PDF:", err);
  }

  return member;
}

export async function approveApplication(
  applicationId: string,
  reviewerId: string,
  options?: { exempt?: boolean }
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { payments: true, member: true },
  });

  if (!application) throw new Error("Candidatura não encontrada");
  if (!["submitted", "awaiting_review", "in_review", "complemented"].includes(application.status)) {
    throw new Error("Status inválido para aprovação");
  }

  const { userId } = await ensureApplicationUser(applicationId);
  const exempt = options?.exempt ?? false;

  const existingPayment = await prisma.payment.findFirst({
    where: { applicationId, type: "application_fee" },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        userId,
        applicationId,
        type: "application_fee",
        provider: "mercadopago",
        amount: APPLICATION_FEE_CARD_AMOUNT,
        status: exempt ? "exempt" : "pending",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: exempt ? ApplicationStatus.approved : ApplicationStatus.approved_pending_payment,
      reviewedAt: new Date(),
      reviewerId,
      decision: "approved",
    },
  });

  if (exempt) {
    return finalizeApplicationApproval(applicationId, reviewerId);
  }

  return null;
}

const ADMIN_UPDATABLE_STATUSES = [
  "draft",
  "submitted",
  "awaiting_review",
  "in_review",
  "awaiting_complement",
  "complemented",
  "approved_pending_payment",
  "approved",
  "rejected",
] as const;

type AdminUpdatableStatus = (typeof ADMIN_UPDATABLE_STATUSES)[number];

async function revertApprovedApplicationSideEffects(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { member: true, user: true },
  });

  if (!application?.member) return;

  await prisma.$transaction(async (tx) => {
    await tx.member.delete({ where: { id: application.member!.id } });

    if (application.userId) {
      const user = await tx.user.findUnique({ where: { id: application.userId } });
      if (user?.role === "member") {
        await tx.user.update({
          where: { id: application.userId },
          data: { role: "candidate" },
        });
      }
    }
  });
}

async function ensureApplicationFeePayment(
  applicationId: string,
  userId: string,
  options?: { forcePending?: boolean }
) {
  const existingPayment = await prisma.payment.findFirst({
    where: { applicationId, type: "application_fee" },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        userId,
        applicationId,
        type: "application_fee",
        provider: "mercadopago",
        amount: APPLICATION_FEE_CARD_AMOUNT,
        status: "pending",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return;
  }

  if (
    options?.forcePending &&
    !["pending", "overdue"].includes(existingPayment.status)
  ) {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { status: "pending", paidAt: null, providerPaymentId: null },
    });
  }
}

export async function updateApplicationStatusForAdmin(
  applicationId: string,
  status: AdminUpdatableStatus,
  reviewerId = "admin"
) {
  if (!ADMIN_UPDATABLE_STATUSES.includes(status)) {
    throw new Error("Status inválido");
  }

  const current = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      member: true,
      payments: true,
      user: { include: { person: true } },
      candidate: true,
    },
  });

  if (!current) throw new Error("Candidatura não encontrada");

  const contactEmail =
    current.candidate?.email ??
    current.user?.person?.email ??
    current.user?.email ??
    "";
  const contactName =
    current.candidate?.fullName ??
    current.user?.person?.fullName ??
    "Candidato";

  if (current.status === "approved" && status !== "approved") {
    await revertApprovedApplicationSideEffects(applicationId);
  }

  if (status === "approved_pending_payment") {
    const { userId } = await ensureApplicationUser(applicationId);
    await ensureApplicationFeePayment(applicationId, userId, { forcePending: true });

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.approved_pending_payment,
        reviewedAt: new Date(),
        reviewerId,
        decision: "approved",
      },
    });

    if (contactEmail) {
      await sendApplicationApprovedPendingPaymentEmail(contactEmail, contactName);
    }

    return updated;
  }

  if (status === "approved") {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { member: true, payments: true },
    });

    if (!application) throw new Error("Candidatura não encontrada");

    const applicationPayment = application.payments.find((p) => p.type === "application_fee");
    if (
      applicationPayment &&
      applicationPayment.status !== "paid" &&
      applicationPayment.status !== "exempt"
    ) {
      await prisma.payment.update({
        where: { id: applicationPayment.id },
        data: {
          status: "paid",
          paidAt: new Date(),
          providerPaymentId: applicationPayment.providerPaymentId ?? `manual-${Date.now()}`,
        },
      });
    }

    if (application.member) {
      return prisma.application.update({
        where: { id: applicationId },
        data: { status: "approved" },
      });
    }

    await finalizeApplicationApproval(applicationId, reviewerId);
    return prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: status as ApplicationStatus },
  });

  if (status === "awaiting_complement" && contactEmail) {
    await sendComplementRequestEmail(contactEmail, contactName);
  }

  return updated;
}

async function deleteApplicationDocumentsFromDisk(
  documents: { filePath: string }[]
) {
  await Promise.all(
    documents.map(async (doc) => {
      try {
        await unlink(path.resolve(process.cwd(), doc.filePath));
      } catch (err) {
        console.error("Erro ao remover documento do disco:", err);
      }
    })
  );
}

export async function rejectApplication(
  applicationId: string,
  reviewerId: string,
  reasonInternal: string,
  reasonPublic?: string
) {
  const documents = await prisma.document.findMany({
    where: { applicationId },
    select: { filePath: true },
  });

  const app = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "rejected",
        reviewedAt: new Date(),
        reviewerId,
        decision: "rejected",
        decisionReasonInternal: reasonInternal,
        decisionReasonPublic: reasonPublic,
      },
    });

    await tx.document.deleteMany({ where: { applicationId } });

    await tx.auditLog.create({
      data: {
        actorUserId: resolveAuditActorUserId(reviewerId),
        action: "application.rejected",
        entityType: "application",
        entityId: applicationId,
      },
    });

    return updated;
  });

  await deleteApplicationDocumentsFromDisk(documents);

  return app;
}

export async function requestComplement(
  applicationId: string,
  reviewerId: string,
  note: string
) {
  const authorId = await resolvePortalAdminAuthorId(reviewerId);

  return prisma.$transaction(async (tx) => {
    const app = await tx.application.update({
      where: { id: applicationId },
      data: { status: "awaiting_complement" },
    });

    await tx.adminNote.create({
      data: {
        applicationId,
        authorId,
        note,
        visibility: "candidate",
      },
    });

    return app;
  });
}

