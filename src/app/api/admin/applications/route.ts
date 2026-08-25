import { NextRequest, NextResponse } from "next/server";
import {
  sendApplicationApprovedPendingPaymentEmail,
  sendApplicationRejectedEmail,
  sendComplementRequestEmail,
} from "@/lib/email";
import {
  approveApplication,
  rejectApplication,
  requestComplement,
  updateApplicationStatusForAdmin,
  APPLICATION_STATUS_LABELS,
} from "@/lib/applications";
import {
  cleanupAllOrphanDraftApplications,
  filterDuplicateKanbanApplications,
} from "@/lib/application-duplicates";
import { requireStaffPermission, staffAuthErrorResponse } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCpfForDisplay } from "@/lib/pii";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireStaffPermission(request, "secretariat");
  } catch (error) {
    return staffAuthErrorResponse(error);
  }

  await cleanupAllOrphanDraftApplications();

  const status = request.nextUrl.searchParams.get("status");

  const rawApplications = await prisma.application.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      user: { include: { person: true } },
      candidate: true,
      documents: true,
      educationRecords: true,
      curriculumRecord: true,
      publicProfileDraft: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  const applications = await filterDuplicateKanbanApplications(rawApplications);

  const stats = {
    total: applications.length,
    awaiting: applications.filter((a) =>
      ["submitted", "awaiting_review", "in_review", "complemented", "approved_pending_payment"].includes(a.status)
    ).length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    complement: applications.filter((a) => a.status === "awaiting_complement").length,
  };

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      statusLabel: APPLICATION_STATUS_LABELS[a.status] ?? a.status,
      category: a.categoryRequested,
      categoryLabel: CATEGORY_LABELS[a.categoryRequested],
      submittedAt: a.submittedAt,
      createdAt: a.createdAt,
      reviewedAt: a.reviewedAt,
      candidateName:
        a.candidate?.fullName ??
        a.user?.person?.fullName ??
        a.user?.email ??
        "Candidato",
      candidateEmail: a.candidate?.email ?? a.user?.person?.email ?? a.user?.email ?? "",
      cpf: formatCpfForDisplay(
        (a.candidate ?? a.user?.person ?? null)?.cpfEncrypted ?? null
      ),
      documentsCount: a.documents.length,
      currentStep: a.currentStep,
    })),
    stats,
  });
}

export async function PATCH(request: NextRequest) {
  let session;
  try {
    session = await requireStaffPermission(request, "secretariat");
  } catch (error) {
    return staffAuthErrorResponse(error);
  }

  const body = await request.json();
  const { applicationId, action, reasonInternal, reasonPublic, note } = body;
  const actorId = session.userId;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: { include: { person: true } }, candidate: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  const email =
    application.candidate?.email ??
    application.user?.person?.email ??
    application.user?.email ??
    "";
  const name =
    application.candidate?.fullName ??
    application.user?.person?.fullName ??
    "Candidato";

  switch (action) {
    case "approve": {
      const member = await approveApplication(applicationId, actorId);
      if (!member) {
        await sendApplicationApprovedPendingPaymentEmail(email, name);
      }
      return NextResponse.json({ ok: true, member });
    }
    case "approve_exempt": {
      const member = await approveApplication(applicationId, actorId, { exempt: true });
      if (!member) {
        return NextResponse.json({ error: "Não foi possível aprovar a candidatura" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, member });
    }
    case "reject": {
      await rejectApplication(
        applicationId,
        actorId,
        reasonInternal || "Reprovado pela secretaria via painel",
        reasonPublic
      );
      await sendApplicationRejectedEmail(email, name);
      return NextResponse.json({ ok: true });
    }
    case "complement": {
      if (!note) {
        return NextResponse.json({ error: "Nota obrigatória" }, { status: 400 });
      }
      await requestComplement(applicationId, actorId, note);
      await sendComplementRequestEmail(email, name);
      return NextResponse.json({ ok: true });
    }
    case "start_review": {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: "in_review" },
      });
      return NextResponse.json({ ok: true });
    }
    case "update_status": {
      const { status } = body;
      const allowed = [
        "draft",
        "submitted",
        "awaiting_review",
        "in_review",
        "awaiting_complement",
        "complemented",
        "approved_pending_payment",
        "approved",
        "rejected",
      ];
      if (!status || !allowed.includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      try {
        const updated = await updateApplicationStatusForAdmin(applicationId, status, actorId);
        return NextResponse.json({ ok: true, application: updated });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao atualizar status";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
}
