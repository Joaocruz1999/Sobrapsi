import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  requireStaffPermission,
  staffAuthErrorResponse,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Aguardando revisão",
  approved: "Publicado",
  rejected: "Ajustes necessários",
};

function toPhotoDisplayUrl(publicPhotoUrl: string | null): string | null {
  if (!publicPhotoUrl) return null;
  if (publicPhotoUrl.startsWith("http")) return publicPhotoUrl;
  return `/api/files/${publicPhotoUrl}`;
}

function serializeProfile(
  profile: {
    id: string;
    publicName: string;
    publicCity: string | null;
    publicState: string | null;
    publicBio: string | null;
    publicEducationSummary: string | null;
    publicStudyAreas: string | null;
    publicWebsite: string | null;
    publicLinkedin: string | null;
    publicInstagram: string | null;
    publicPhotoUrl: string | null;
    publishPhoto: boolean;
    publishBio: boolean;
    publishLinks: boolean;
    isPublic: boolean;
    reviewStatus: string;
    reviewedAt: Date | null;
    updatedAt: Date;
    member: {
      registrationNumber: string;
      category: string;
      status: string;
      user: {
        email: string;
        person: { fullName: string; email: string } | null;
      };
    };
  }
) {
  return {
    id: profile.id,
    publicName: profile.publicName,
    publicCity: profile.publicCity,
    publicState: profile.publicState,
    publicBio: profile.publicBio,
    publicEducationSummary: profile.publicEducationSummary,
    publicStudyAreas: profile.publicStudyAreas,
    publicWebsite: profile.publicWebsite,
    publicLinkedin: profile.publicLinkedin,
    publicInstagram: profile.publicInstagram,
    publicPhotoUrl: profile.publicPhotoUrl,
    photoUrl: toPhotoDisplayUrl(profile.publicPhotoUrl),
    publishPhoto: profile.publishPhoto,
    publishBio: profile.publishBio,
    publishLinks: profile.publishLinks,
    isPublic: profile.isPublic,
    reviewStatus: profile.reviewStatus,
    reviewStatusLabel: REVIEW_STATUS_LABELS[profile.reviewStatus] ?? profile.reviewStatus,
    reviewedAt: profile.reviewedAt,
    updatedAt: profile.updatedAt,
    registrationNumber: profile.member.registrationNumber,
    memberCategory: profile.member.category,
    memberCategoryLabel: CATEGORY_LABELS[profile.member.category as keyof typeof CATEGORY_LABELS],
    memberStatus: profile.member.status,
    memberEmail: profile.member.user.person?.email ?? profile.member.user.email,
    memberFullName: profile.member.user.person?.fullName ?? profile.publicName,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffPermission(request, "secretariat");
  } catch (error) {
    return staffAuthErrorResponse(error);
  }

  const status = request.nextUrl.searchParams.get("status");

  const profiles = await prisma.publicProfile.findMany({
    where: status ? { reviewStatus: status as never } : undefined,
    include: {
      member: {
        include: {
          user: { include: { person: true } },
        },
      },
    },
    orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const serialized = profiles.map(serializeProfile);
  const stats = {
    pending: serialized.filter((p) => p.reviewStatus === "pending_review").length,
    approved: serialized.filter((p) => p.reviewStatus === "approved").length,
    rejected: serialized.filter((p) => p.reviewStatus === "rejected").length,
    draft: serialized.filter((p) => p.reviewStatus === "draft").length,
    total: serialized.length,
  };

  return NextResponse.json({ profiles: serialized, stats });
}

export async function PATCH(request: NextRequest) {
  let session;
  try {
    session = await requireStaffPermission(request, "secretariat");
  } catch (error) {
    return staffAuthErrorResponse(error);
  }

  try {
    const body = await request.json();
    const { profileId, action, reasonPublic } = body as {
      profileId?: string;
      action?: "approve" | "reject";
      reasonPublic?: string;
    };

    if (!profileId || !action) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const existing = await prisma.publicProfile.findUnique({
      where: { id: profileId },
      include: {
        member: {
          include: {
            user: { include: { person: true } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

    if (action === "approve") {
      const profile = await prisma.publicProfile.update({
        where: { id: profileId },
        data: {
          reviewStatus: "approved",
          reviewedAt: new Date(),
          reviewedBy: session.userId,
        },
        include: {
          member: {
            include: {
              user: { include: { person: true } },
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: "public_profile.approved",
          entityType: "public_profile",
          entityId: profileId,
          afterJson: JSON.stringify({ registrationNumber: profile.member.registrationNumber }),
        },
      });

      return NextResponse.json({ ok: true, profile: serializeProfile(profile) });
    }

    if (action === "reject") {
      const profile = await prisma.publicProfile.update({
        where: { id: profileId },
        data: {
          reviewStatus: "rejected",
          reviewedAt: new Date(),
          reviewedBy: session.userId,
        },
        include: {
          member: {
            include: {
              user: { include: { person: true } },
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: "public_profile.rejected",
          entityType: "public_profile",
          entityId: profileId,
          afterJson: JSON.stringify({
            registrationNumber: profile.member.registrationNumber,
            reasonPublic: reasonPublic ?? null,
          }),
        },
      });

      return NextResponse.json({ ok: true, profile: serializeProfile(profile) });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erro ao revisar perfil" }, { status: 500 });
  }
}
