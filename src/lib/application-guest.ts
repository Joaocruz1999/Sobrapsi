import "server-only";

import { prepareCpfForStorage, prepareRgForStorage } from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import type { MemberCategory, Prisma } from "@prisma/client";

export const applicationInclude = {
  educationRecords: true,
  curriculumRecord: true,
  documents: true,
  publicProfileDraft: true,
  candidate: true,
} satisfies Prisma.ApplicationInclude;

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

export function buildPendingApplicationShell(pendingCpf?: string) {
  return {
    id: "",
    status: "draft" as const,
    categoryRequested: "student" as MemberCategory,
    currentStep: 1,
    attendingCourseType: null,
    attendingInstitution: null,
    attendingInstitutionOther: null,
    documents: [],
    educationRecords: [],
    curriculumRecord: null,
    publicProfileDraft: null,
    candidate: pendingCpf
      ? { cpfEncrypted: pendingCpf, fullName: "", email: "" }
      : null,
    userId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function createGuestApplicationWithPersonal(
  cpf: string,
  category: MemberCategory,
  data: Record<string, unknown>,
  attending?: {
    attendingCourseType?: string;
    attendingInstitution?: string;
    attendingInstitutionOther?: string | null;
  }
) {
  const { getApplicationStepIndex } = await import("@/lib/application-steps");
  const app = await prisma.application.create({
    data: {
      categoryRequested: category,
      status: "draft",
      currentStep: getApplicationStepIndex(category, "personal"),
      attendingCourseType: attending?.attendingCourseType || null,
      attendingInstitution: attending?.attendingInstitution || null,
      attendingInstitutionOther: attending?.attendingInstitutionOther || null,
    },
    include: applicationInclude,
  });

  await upsertApplicationCandidate(app.id, {
    ...data,
    cpf: data.cpf ?? cpf,
  });

  return getApplicationById(app.id);
}

export async function deleteDraftWithoutPersistableContact(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: true },
  });

  if (!application || application.status !== "draft") return false;

  const { hasPersistableDraftContact } = await import("@/lib/application-shared");
  if (hasPersistableDraftContact(application.candidate ?? {})) return false;

  await prisma.application.delete({ where: { id: applicationId } });
  return true;
}

export async function createGuestApplication() {
  return prisma.application.create({
    data: {
      categoryRequested: "student",
      status: "draft",
      currentStep: 1,
    },
    include: applicationInclude,
  });
}

export async function getApplicationById(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: applicationInclude,
  });
}

export async function getApplicationForCandidate(applicationId: string) {
  const application = await getApplicationById(applicationId);
  if (!application || application.userId) return null;
  if (!["draft", "awaiting_complement"].includes(application.status)) {
    return null;
  }
  return application;
}

export function candidateDataFromPayload(data: Record<string, unknown>) {
  const cpfStored = prepareCpfForStorage(data.cpf ? String(data.cpf) : null);
  const rgStored = prepareRgForStorage(data.rg ? String(data.rg) : null);
  return {
    fullName: String(data.fullName ?? ""),
    socialName: data.socialName ? String(data.socialName) : null,
    cpfEncrypted: cpfStored.cpfEncrypted,
    cpfHash: cpfStored.cpfHash,
    rgEncrypted: rgStored.rgEncrypted,
    rgIssuer: data.rgIssuer ? String(data.rgIssuer) : null,
    birthDate: data.birthDate ? new Date(String(data.birthDate)) : null,
    nationality: data.nationality ? String(data.nationality) : null,
    address: data.address ? String(data.address) : null,
    city: data.city ? String(data.city) : null,
    state: data.state ? String(data.state) : null,
    zipCode: data.zipCode ? String(data.zipCode) : null,
    email: String(data.email ?? "").toLowerCase().trim(),
    phone: data.phone ? String(data.phone) : null,
    phoneAlt: data.phoneAlt ? String(data.phoneAlt) : null,
  };
}

export function candidateProfessionalFromPayload(data: Record<string, unknown>) {
  return {
    profession: data.profession ? String(data.profession) : null,
    occupation: data.occupation ? String(data.occupation) : null,
    institution: data.institution ? String(data.institution) : null,
    cnpj: data.cnpj ? String(data.cnpj) : null,
    professionalWebsite: data.professionalWebsite
      ? String(data.professionalWebsite)
      : null,
    linkedin: data.linkedin ? String(data.linkedin) : null,
    instagram: data.instagram ? String(data.instagram) : null,
    practiceCity: data.practiceCity ? String(data.practiceCity) : null,
    practiceModality: data.practiceModality
      ? String(data.practiceModality)
      : null,
    studyAreas: data.studyAreas ? String(data.studyAreas) : null,
    authorizePublicProfessional: Boolean(data.authorizePublicProfessional ?? false),
  };
}

export async function upsertApplicationCandidate(
  applicationId: string,
  data: Record<string, unknown>
) {
  const personal = candidateDataFromPayload(data);
  return prisma.applicationCandidate.upsert({
    where: { applicationId },
    create: { applicationId, ...personal },
    update: personal,
  });
}

export async function updateApplicationCandidateProfessional(
  applicationId: string,
  data: Record<string, unknown>
) {
  const professional = candidateProfessionalFromPayload(data);
  return prisma.applicationCandidate.update({
    where: { applicationId },
    data: professional,
  });
}

export function getCandidateContact(
  application: {
    candidate?: { fullName: string; email: string; cpfEncrypted?: string | null } | null;
    user?: { email: string; person?: { fullName: string; email: string; cpfEncrypted?: string | null } | null } | null;
  }
) {
  if (application.user?.person) {
    return {
      fullName: application.user.person.fullName,
      email: application.user.person.email,
    };
  }
  if (application.candidate) {
    return {
      fullName: application.candidate.fullName,
      email: application.candidate.email,
    };
  }
  return null;
}
