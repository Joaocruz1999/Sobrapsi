import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUS_LABELS } from "@/lib/applications";
import { CATEGORY_LABELS } from "@/lib/constants";
import { withDecryptedPiiForDisplay } from "@/lib/pii";

import { requireStaffPermission, staffAuthErrorResponse } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission(request, "secretariat");
  } catch (error) {
    return staffAuthErrorResponse(error);
  }

  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      user: { include: { person: true } },
      candidate: true,
      documents: true,
      educationRecords: true,
      curriculumRecord: true,
      publicProfileDraft: true,
      adminNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  }

  const personSource = application.candidate ?? application.user?.person ?? null;

  return NextResponse.json({
    application: {
      ...application,
      statusLabel: APPLICATION_STATUS_LABELS[application.status],
      categoryLabel: CATEGORY_LABELS[application.categoryRequested],
      person: withDecryptedPiiForDisplay(personSource),
    },
  });
}
