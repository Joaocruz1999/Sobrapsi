import { NextRequest, NextResponse } from "next/server";
import { listMembersForAdmin } from "@/lib/admin-members";
import { requireStaffPermission, staffAuthErrorResponse } from "@/lib/admin-auth";
import { buildMembersCsv, buildMembersXlsx } from "@/lib/admin-members-export";
import { MEMBER_STATUSES, type MemberStatus } from "@/lib/member-types";

function parseStatuses(raw: string | null): MemberStatus[] | undefined {
  if (!raw || raw === "all") return undefined;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const invalid = parts.filter((s) => !MEMBER_STATUSES.includes(s as MemberStatus));
  if (invalid.length) {
    throw new Error(`Status inválido: ${invalid.join(", ")}`);
  }
  return parts as MemberStatus[];
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffPermission(request, "secretariat");

    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format");
    if (format !== "csv" && format !== "xlsx") {
      return NextResponse.json(
        { error: "Parâmetro format deve ser csv ou xlsx" },
        { status: 400 }
      );
    }

    let statuses: MemberStatus[] | undefined;
    try {
      statuses = parseStatuses(searchParams.get("status"));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Status inválido" },
        { status: 400 }
      );
    }

    const members = await listMembersForAdmin(
      statuses?.length ? { status: statuses } : undefined
    );

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const content = buildMembersCsv(members);
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="associados-${stamp}.csv"`,
        },
      });
    }

    const buffer = await buildMembersXlsx(members);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="associados-${stamp}.xlsx"`,
      },
    });
  } catch (error) {
    return staffAuthErrorResponse(error);
  }
}
