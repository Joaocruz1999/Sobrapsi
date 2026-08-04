import "server-only";

import { normalizeCpf } from "@/lib/application-shared";
import { readCpf } from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/staff-permissions";

type ApplicationWithIdentity = {
  id: string;
  status: string;
  userId: string | null;
  candidate?: { cpfEncrypted: string | null; cpfHash: string | null } | null;
  user?: { person?: { cpfEncrypted: string | null; cpfHash: string | null } | null } | null;
};

function getApplicationCpf(app: ApplicationWithIdentity): string | null {
  const stored = app.candidate?.cpfEncrypted ?? app.user?.person?.cpfEncrypted ?? null;
  const cpf = readCpf(stored);
  return cpf ? normalizeCpf(cpf) : null;
}

export async function getStaffUserIds(): Promise<Set<string>> {
  const users = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: { id: true },
  });

  return new Set(users.map((user) => user.id));
}

export async function cleanupStaffUserApplications(userId?: string) {
  await prisma.application.deleteMany({
    where: {
      user: {
        role: { in: STAFF_ROLES },
        ...(userId ? { id: userId } : {}),
      },
    },
  });
}

export async function cleanupOrphanDraftApplications(userId: string) {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) return;

  await prisma.application.deleteMany({
    where: {
      userId,
      status: "draft",
      id: member.applicationId ? { not: member.applicationId } : undefined,
    },
  });
}

export async function cleanupAllOrphanDraftApplications() {
  await cleanupStaffUserApplications();

  const members = await prisma.member.findMany({
    select: { userId: true, applicationId: true },
  });

  for (const member of members) {
    await prisma.application.deleteMany({
      where: {
        userId: member.userId,
        status: "draft",
        ...(member.applicationId ? { id: { not: member.applicationId } } : {}),
      },
    });
  }
}

export async function buildApprovedCpfSet(): Promise<Set<string>> {
  const approved = await prisma.application.findMany({
    where: { status: "approved" },
    select: {
      candidate: { select: { cpfEncrypted: true } },
      user: { select: { person: { select: { cpfEncrypted: true } } } },
    },
  });

  const cpfs = new Set<string>();
  for (const app of approved) {
    const cpf = readCpf(app.candidate?.cpfEncrypted ?? app.user?.person?.cpfEncrypted);
    if (cpf) cpfs.add(normalizeCpf(cpf));
  }
  return cpfs;
}

export async function filterDuplicateKanbanApplications<T extends ApplicationWithIdentity>(
  applications: T[]
): Promise<T[]> {
  const memberUserIds = new Set(
    (await prisma.member.findMany({ select: { userId: true } })).map((m) => m.userId)
  );
  const staffUserIds = await getStaffUserIds();
  const approvedCpfs = await buildApprovedCpfSet();

  return applications.filter((app) => {
    if (app.userId && staffUserIds.has(app.userId)) return false;
    if (app.status !== "draft") return true;
    if (app.userId && memberUserIds.has(app.userId)) return false;

    const cpf = getApplicationCpf(app);
    if (cpf && approvedCpfs.has(cpf)) return false;

    return true;
  });
}

export function isDuplicateDraftApplication(
  app: ApplicationWithIdentity,
  memberUserIds: Set<string>,
  approvedCpfs: Set<string>
) {
  if (app.status !== "draft") return false;
  if (app.userId && memberUserIds.has(app.userId)) return true;
  const cpf = getApplicationCpf(app);
  return Boolean(cpf && approvedCpfs.has(cpf));
}
