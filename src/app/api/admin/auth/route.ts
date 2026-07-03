import { NextRequest, NextResponse } from "next/server";
import { getAdminSecret } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    if (secret !== getAdminSecret()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "ADMIN_SECRET não configurado" }, { status: 500 });
  }
}
