import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, getSession } from "@/lib/auth";
import { formatBirthDateAsPassword } from "@/lib/application-shared";
import { getUserById, hashPassword, verifyLoginPassword } from "@/lib/users";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    const user = await getUserById(session.userId);
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Conta inválida" }, { status: 400 });
    }

    if (!session.mustChangePassword && !data.currentPassword) {
      return NextResponse.json({ error: "Informe a senha atual" }, { status: 400 });
    }

    if (data.currentPassword) {
      const valid = await verifyLoginPassword(data.currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
      }
    } else if (session.mustChangePassword) {
      return NextResponse.json({ error: "Informe a senha atual" }, { status: 400 });
    }

    const birthDatePassword = formatBirthDateAsPassword(user.person?.birthDate ?? null);
    if (birthDatePassword && data.newPassword === birthDatePassword) {
      return NextResponse.json(
        { error: "Escolha uma senha diferente da data de nascimento" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Erro ao alterar senha" }, { status: 500 });
  }
}
