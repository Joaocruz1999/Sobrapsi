import { NextRequest, NextResponse } from "next/server";
import {
  listSupervisionPackageOrdersForKanban,
  updateSupervisionPackageOrderStatus,
} from "@/lib/admin-supervision-packages";
import { requireStaffPermission, staffAuthErrorResponse } from "@/lib/admin-auth";
import { SUPERVISION_PACKAGE_KANBAN_COLUMNS } from "@/lib/supervision-package-kanban";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireStaffPermission(request, "secretariat");
    const orders = await listSupervisionPackageOrdersForKanban();
    const stats = {
      total: orders.length,
      draft: orders.filter((o) => o.status === "draft").length,
      received: orders.filter((o) => o.status === "received").length,
      awaitingPayment: orders.filter((o) => o.status === "awaiting_payment").length,
    };
    return NextResponse.json({ orders, stats });
  } catch (error) {
    return staffAuthErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireStaffPermission(request, "secretariat");
    const body = await request.json();
    const { orderId, action, status } = body as {
      orderId?: string;
      action?: string;
      status?: string;
    };

    if (!orderId) {
      return NextResponse.json({ error: "orderId obrigatório" }, { status: 400 });
    }

    if (action !== "update_status" || !status) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const allowed = SUPERVISION_PACKAGE_KANBAN_COLUMNS.some(
      (col) => col.status === status
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Etapa inválida para o kanban do grupo" },
        { status: 400 }
      );
    }

    const order = await updateSupervisionPackageOrderStatus(
      orderId,
      status,
      session.userId
    );

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && !(error as { code?: string }).code) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return staffAuthErrorResponse(error);
  }
}
