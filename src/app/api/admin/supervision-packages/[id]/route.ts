import { NextRequest, NextResponse } from "next/server";
import { getSupervisionPackageOrderDetail } from "@/lib/admin-supervision-packages";
import { requireStaffPermission, staffAuthErrorResponse } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffPermission(request, "secretariat");
    const { id } = await context.params;
    const order = await getSupervisionPackageOrderDetail(id);
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message === "Pedido não encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return staffAuthErrorResponse(error);
  }
}
