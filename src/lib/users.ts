import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeBirthDatePasswordInput, normalizeCpf } from "@/lib/application-shared";
import { hashCpf } from "@/lib/crypto";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function verifyLoginPassword(password: string, hash: string) {
  if (await verifyPassword(password, hash)) return true;

  const normalizedBirthDate = normalizeBirthDatePasswordInput(password);
  if (normalizedBirthDate !== password) {
    return verifyPassword(normalizedBirthDate, hash);
  }

  return false;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { person: true, member: true },
  });
}

export async function getUserByCpf(cpf: string) {
  const normalized = normalizeCpf(cpf);
  if (normalized.length !== 11) return null;

  const cpfHash = hashCpf(normalized);
  const person = await prisma.person.findFirst({
    where: { cpfHash },
    include: {
      user: {
        include: { person: true, member: true },
      },
    },
  });

  return person?.user ?? null;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { person: true, member: true },
  });
}
