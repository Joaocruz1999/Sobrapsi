import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin-auth";
import { getSession } from "@/lib/auth";
import { getCandidateSession } from "@/lib/candidate-auth";
import { getMemberUploadStorageKeys } from "@/lib/member-photo";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments?.length || segments[0] !== "uploads") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const storageKey = segments[1];
    const userSession = await getSession();
    const candidateSession = await getCandidateSession();
    const staffSession = await getStaffSession();

    let memberStorageKeys: string[] = [];
    if (userSession?.userId) {
      memberStorageKeys = await getMemberUploadStorageKeys(userSession.userId);
    }

    const authorized =
      Boolean(staffSession) ||
      (userSession?.userId && memberStorageKeys.includes(storageKey)) ||
      (candidateSession?.applicationId && storageKey === candidateSession.applicationId);

    if (!authorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const absolutePath = path.resolve(process.cwd(), ...segments);
    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    if (!absolutePath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    const buffer = await readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
}
