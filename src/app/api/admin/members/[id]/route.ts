import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteMemberAccount,
  getMemberForAdmin,
  resetMemberPasswordToBirthDate,
  setMemberStatus,
  updateMemberDetails,
} from "@/lib/admin-members";
import { requireStaffPermission, staffAuthErrorResponse } from "@/lib/admin-auth";
import { MEMBER_CATEGORIES } from "@/lib/member-types";

const updateMemberSchema = z.object({
  action: z.enum(["update", "suspend", "activate", "resetPassword"]).optional(),
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  publicName: z.string().min(2).optional(),
  category: z.enum(MEMBER_CATEGORIES).optional(),
  validUntil: z.string().nullable().optional(),
  publicCity: z.string().nullable().optional(),
  publicState: z.string().nullable().optional(),
  publicBio: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  // Campos de cadastro editáveis apenas pela secretaria
  cpf: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission(request, "secretariat");
    const { id } = await params;
    const member = await getMemberForAdmin(id);

    if (!member) {
      return NextResponse.json({ error: "Associado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    return staffAuthErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission(request, "secretariat");
    const { id } = await params;
    const body = await request.json();
    const data = updateMemberSchema.parse(body);

    if (data.action === "suspend") {
      const member = await setMemberStatus(id, "suspended");
      if (!member) {
        return NextResponse.json({ error: "Associado não encontrado" }, { status: 404 });
      }
      return NextResponse.json({ member });
    }

    if (data.action === "activate") {
      const member = await setMemberStatus(id, "active");
      if (!member) {
        return NextResponse.json({ error: "Associado não encontrado" }, { status: 404 });
      }
      return NextResponse.json({ member });
    }

    if (data.action === "resetPassword") {
      await resetMemberPasswordToBirthDate(id);
      return NextResponse.json({ ok: true });
    }

    const member = await updateMemberDetails(id, data);
    if (!member) {
      return NextResponse.json({ error: "Associado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("nascimento")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return staffAuthErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission(request, "secretariat");
    const { id } = await params;
    const deleted = await deleteMemberAccount(id);

    if (!deleted) {
      return NextResponse.json({ error: "Associado não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return staffAuthErrorResponse(error);
  }
}
