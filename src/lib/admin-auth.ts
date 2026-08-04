import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessEditorial,
  canAccessSecretariat,
  canManageStaff,
  isStaffRole,
} from "@/lib/staff-permissions";

export async function getStaffSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) return null;
  return session;
}

export async function requireStaffSession() {
  const session = await getStaffSession();
  if (!session) {
    throw new StaffAuthError("UNAUTHORIZED");
  }
  return session;
}

export class StaffAuthError extends Error {
  constructor(public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
  }
}

export function staffAuthErrorResponse(error: unknown) {
  if (error instanceof StaffAuthError) {
    return NextResponse.json(
      { error: error.code === "FORBIDDEN" ? "Acesso negado" : "Não autorizado" },
      { status: error.code === "FORBIDDEN" ? 403 : 401 }
    );
  }
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

export async function authorizeStaffRequest(
  request: NextRequest,
  permission: "secretariat" | "editorial" | "staff-management"
) {
  const session = await getStaffSession();
  if (!session) return null;

  const staffEditor =
    session.staffEditor ??
    (session.role === "secretaria" ? await loadStaffEditorFlag(session.userId) : false);

  if (permission === "staff-management" && !canManageStaff(session.role)) {
    return null;
  }
  if (permission === "secretariat" && !canAccessSecretariat(session.role)) {
    return null;
  }
  if (permission === "editorial" && !canAccessEditorial(session.role, staffEditor)) {
    return null;
  }

  return { ...session, staffEditor };
}

async function loadStaffEditorFlag(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { staffEditor: true },
  });
  return user?.staffEditor ?? false;
}

export async function requireStaffPermission(
  request: NextRequest,
  permission: "secretariat" | "editorial" | "staff-management"
) {
  const session = await authorizeStaffRequest(request, permission);
  if (!session) {
    throw new StaffAuthError(
      (await getStaffSession()) ? "FORBIDDEN" : "UNAUTHORIZED"
    );
  }
  return session;
}
