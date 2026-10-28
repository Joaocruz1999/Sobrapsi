import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidCpf } from "@/lib/application-shared";
import { createSupervisionPackagePayment } from "@/lib/supervision-package";

const bodySchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo"),
  cpf: z
    .string()
    .min(1, "Informe o CPF")
    .refine((value) => isValidCpf(value), { message: "CPF inválido" }),
  phone: z
    .string()
    .min(1, "Informe o telefone")
    .refine((value) => value.replace(/\D/g, "").length >= 10, {
      message: "Informe um telefone válido com DDD",
    }),
  claimsMember: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await createSupervisionPackagePayment(body);

    return NextResponse.json({
      ok: true,
      paymentId: result.payment.id,
      amount: result.amount,
      isMember: result.isMember,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Erro ao iniciar compra";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
