import "server-only";

import {
  APPLICATION_STATUS_LABELS,
  hasPersistableDraftContact,
  normalizeCpf,
} from "@/lib/application-shared";
import { hashCpf } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const EDITABLE_STATUSES = new Set(["draft", "awaiting_complement"]);

const ACTIVE_STATUSES = new Set([
  "draft",
  "submitted",
  "awaiting_review",
  "in_review",
  "awaiting_complement",
  "complemented",
  "approved_pending_payment",
]);

type ApplicationSummary = {
  id: string;
  status: string;
  reviewedAt: Date | null;
  updatedAt: Date;
  candidate?: { email: string; phone: string | null } | null;
};

export type CpfCandidatureEligibility =
  | { action: "resume"; applicationId: string; statusLabel: string }
  | {
      action: "track";
      applicationId: string;
      statusLabel: string;
      message: string;
    }
  | { action: "blocked"; message: string; eligibleAt: Date }
  | { action: "approved"; message: string }
  | { action: "create" };

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function findApplicationsByCpf(cpf: string): Promise<ApplicationSummary[]> {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11) return [];

  const cpfHash = hashCpf(normalized);

  const applications = await prisma.application.findMany({
    select: {
      id: true,
      status: true,
      reviewedAt: true,
      updatedAt: true,
      candidate: {
        select: {
          cpfHash: true,
          email: true,
          phone: true,
        },
      },
      user: { select: { person: { select: { cpfHash: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const matched = applications.filter((app) => {
    const stored =
      app.candidate?.cpfHash ?? app.user?.person?.cpfHash ?? null;
    return stored === cpfHash;
  });

  const persistable: ApplicationSummary[] = [];
  for (const app of matched) {
    if (app.status === "draft" && !hasPersistableDraftContact(app.candidate ?? {})) {
      await prisma.application.delete({ where: { id: app.id } });
      continue;
    }
    persistable.push({
      id: app.id,
      status: app.status,
      reviewedAt: app.reviewedAt,
      updatedAt: app.updatedAt,
      candidate: app.candidate
        ? { email: app.candidate.email, phone: app.candidate.phone }
        : null,
    });
  }

  return persistable;
}

export function resolveCpfCandidatureEligibility(
  applications: ApplicationSummary[]
): CpfCandidatureEligibility {
  const sorted = [...applications].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const active = sorted.filter((app) => ACTIVE_STATUSES.has(app.status));
  if (active.length > 0) {
    const app = active[0];
    if (EDITABLE_STATUSES.has(app.status)) {
      const statusLabel =
        APPLICATION_STATUS_LABELS[app.status] ?? app.status;
      return { action: "resume", applicationId: app.id, statusLabel };
    }

    const statusLabel =
      APPLICATION_STATUS_LABELS[app.status] ?? app.status;
    return {
      action: "track",
      applicationId: app.id,
      statusLabel,
      message: `Já existe uma candidatura em andamento (${statusLabel}). Acompanhe o status ou aguarde a conclusão da análise.`,
    };
  }

  if (sorted.some((app) => app.status === "approved")) {
    return {
      action: "approved",
      message:
        "Este CPF já possui uma candidatura aprovada na SOBRAPSI. Acesse a área do associado para mais informações.",
    };
  }

  const lastRejected = sorted.find((app) => app.status === "rejected");
  if (lastRejected?.reviewedAt) {
    const eligibleAt = addMonths(lastRejected.reviewedAt, 3);
    if (new Date() < eligibleAt) {
      return {
        action: "blocked",
        message: `Sua candidatura foi reprovada. Você poderá iniciar uma nova candidatura em ${formatDate(eligibleAt)}.`,
        eligibleAt,
      };
    }
  }

  return { action: "create" };
}

export async function getCpfCandidatureEligibility(cpf: string) {
  const applications = await findApplicationsByCpf(cpf);
  return resolveCpfCandidatureEligibility(applications);
}

export function formatCpfValidationResponse(eligibility: CpfCandidatureEligibility) {
  switch (eligibility.action) {
    case "create":
      return {
        action: "create" as const,
        message: "CPF validado com sucesso. Você pode iniciar sua candidatura.",
      };
    case "resume":
      return {
        action: "resume" as const,
        message: `Encontramos uma candidatura em edição (${eligibility.statusLabel}). Você pode continuar de onde parou.`,
        statusLabel: eligibility.statusLabel,
      };
    case "track":
      return {
        action: "track" as const,
        message: eligibility.message,
        statusLabel: eligibility.statusLabel,
      };
    case "blocked":
      return {
        action: "blocked" as const,
        message: eligibility.message,
        eligibleAt: eligibility.eligibleAt.toISOString(),
      };
    case "approved":
      return {
        action: "approved" as const,
        message: eligibility.message,
      };
  }
}

export async function validateCpfForApplicationEdit(
  cpf: string,
  currentApplicationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const applications = (await findApplicationsByCpf(cpf)).filter(
    (app) => app.id !== currentApplicationId
  );
  const eligibility = resolveCpfCandidatureEligibility(applications);

  switch (eligibility.action) {
    case "blocked":
      return { ok: false, error: eligibility.message };
    case "approved":
      return { ok: false, error: eligibility.message };
    case "track":
      return { ok: false, error: eligibility.message };
    case "resume":
      return {
        ok: false,
        error:
          "Este CPF já possui outra candidatura em edição. Continue a candidatura existente.",
      };
    case "create":
      return { ok: true };
  }
}
