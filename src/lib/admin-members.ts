import "server-only";

import type { MemberCategory, MemberStatus } from "@prisma/client";
import { formatBirthDateAsPassword } from "@/lib/application-shared";
import { CATEGORY_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users";
import { formatRegistrationNumber } from "@/lib/utils";

export interface AdminMemberItem {
  id: string;
  userId: string;
  email: string;
  publicName: string;
  registrationNumber: string;
  category: MemberCategory;
  categoryLabel: string;
  status: MemberStatus;
  statusLabel: string;
  validUntil: Date | null;
  birthDate: Date | null;
  publicCity: string | null;
  publicState: string | null;
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Ativa",
  expiring: "Vencendo",
  expired: "Vencida",
  suspended: "Suspensa",
  cancelled: "Cancelada",
  inactive: "Inativa",
  deceased: "Falecido",
  honorary: "Honorário",
};

export async function listMembersForAdmin(options?: {
  status?: MemberStatus | MemberStatus[];
}): Promise<AdminMemberItem[]> {
  const statusFilter = options?.status;
  const members = await prisma.member.findMany({
    where: statusFilter
      ? {
          status: Array.isArray(statusFilter)
            ? { in: statusFilter }
            : statusFilter,
        }
      : undefined,
    orderBy: { registrationNumber: "asc" },
    include: {
      user: { include: { person: true } },
      publicProfile: true,
    },
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    email: member.user.email,
    publicName:
      member.publicProfile?.publicName ?? member.user.person?.fullName ?? "Associado",
    registrationNumber: member.registrationNumber,
    category: member.category,
    categoryLabel: CATEGORY_LABELS[member.category],
    status: member.status,
    statusLabel: STATUS_LABELS[member.status],
    validUntil: member.validUntil,
    birthDate: member.user.person?.birthDate ?? null,
    publicCity: member.publicProfile?.publicCity ?? member.user.person?.city ?? null,
    publicState: member.publicProfile?.publicState ?? member.user.person?.state ?? null,
  }));
}

export async function getMemberForAdmin(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: { include: { person: true } },
      publicProfile: true,
      membershipCard: true,
    },
  });

  if (!member) return null;

  return {
    id: member.id,
    userId: member.userId,
    email: member.user.email,
    publicName:
      member.publicProfile?.publicName ?? member.user.person?.fullName ?? "Associado",
    fullName: member.user.person?.fullName ?? "",
    registrationNumber: member.registrationNumber,
    category: member.category,
    status: member.status,
    validUntil: member.validUntil,
    birthDate: member.user.person?.birthDate ?? null,
    publicCity: member.publicProfile?.publicCity ?? member.user.person?.city ?? null,
    publicState: member.publicProfile?.publicState ?? member.user.person?.state ?? null,
    publicBio: member.publicProfile?.publicBio ?? null,
    isPublic: member.publicProfile?.isPublic ?? false,
  };
}

export interface UpdateMemberInput {
  fullName?: string;
  email?: string;
  publicName?: string;
  category?: MemberCategory;
  validUntil?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  publicBio?: string | null;
  isPublic?: boolean;
}

export async function updateMemberDetails(memberId: string, input: UpdateMemberInput) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { include: { person: true } }, publicProfile: true, membershipCard: true },
  });

  if (!member) return null;

  const validUntil =
    input.validUntil === undefined
      ? undefined
      : input.validUntil
        ? new Date(input.validUntil)
        : null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.userId },
      data: {
        ...(input.email ? { email: input.email.toLowerCase().trim() } : {}),
        ...(input.fullName && member.user.person
          ? {
              person: {
                update: {
                  fullName: input.fullName,
                  ...(input.email ? { email: input.email.toLowerCase().trim() } : {}),
                  ...(input.publicCity !== undefined ? { city: input.publicCity } : {}),
                  ...(input.publicState !== undefined ? { state: input.publicState } : {}),
                },
              },
            }
          : {}),
      },
    });

    await tx.member.update({
      where: { id: memberId },
      data: {
        ...(input.category ? { category: input.category } : {}),
        ...(validUntil !== undefined ? { validUntil } : {}),
      },
    });

    if (member.publicProfile) {
      await tx.publicProfile.update({
        where: { id: member.publicProfile.id },
        data: {
          ...(input.publicName ? { publicName: input.publicName } : {}),
          ...(input.publicCity !== undefined ? { publicCity: input.publicCity } : {}),
          ...(input.publicState !== undefined ? { publicState: input.publicState } : {}),
          ...(input.publicBio !== undefined ? { publicBio: input.publicBio } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        },
      });
    }

    if (member.membershipCard && validUntil !== undefined) {
      await tx.membershipCard.update({
        where: { id: member.membershipCard.id },
        data: { validUntil },
      });
    }
  });

  return getMemberForAdmin(memberId);
}

export async function setMemberStatus(memberId: string, status: "active" | "suspended") {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return null;

  await prisma.member.update({
    where: { id: memberId },
    data: {
      status,
      suspendedAt: status === "suspended" ? new Date() : null,
    },
  });

  return getMemberForAdmin(memberId);
}

export async function resetMemberPasswordToBirthDate(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: { include: { person: true } } },
  });

  if (!member?.user.person?.birthDate) {
    throw new Error("Data de nascimento não cadastrada para este associado.");
  }

  const defaultPassword = formatBirthDateAsPassword(member.user.person.birthDate);
  if (!defaultPassword) {
    throw new Error("Não foi possível gerar a senha padrão.");
  }

  await prisma.user.update({
    where: { id: member.userId },
    data: {
      passwordHash: await hashPassword(defaultPassword),
      mustChangePassword: true,
    },
  });

  return { ok: true };
}

export async function deleteMemberAccount(memberId: string) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return false;

  await prisma.user.delete({ where: { id: member.userId } });
  return true;
}

export function normalizeLegacyRegistrationNumber(registrationNumber: string) {
  const legacy = registrationNumber.match(/^SBR-\d{4}-(\d+)$/);
  if (!legacy) return registrationNumber;
  return formatRegistrationNumber(parseInt(legacy[1], 10));
}
