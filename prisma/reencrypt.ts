import { PrismaClient } from "@prisma/client";
import { decryptField, encryptField, hashCpf } from "../src/lib/crypto";
import { normalizeCpf } from "../src/lib/application-shared";

const prisma = new PrismaClient();

/**
 * Detecta se o valor armazenado em cpf_encrypted/rg_encrypted já está
 * criptografado (formato `iv:tag:ciphertext` em hex) ou se ainda é plaintext
 * legado (CPF só com dígitos, RG livre).
 */
function looksEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // iv (12 bytes = 24 hex), tag (16 bytes = 32 hex), resto
  return parts[0].length === 24 && parts[1].length === 32 && /^[0-9a-f]+$/.test(parts[0]) && /^[0-9a-f]+$/.test(parts[1]);
}

/** Extrai o CPF normalizado de um valor armazenado (plaintext ou criptografado). */
function readStoredCpf(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (looksEncrypted(stored)) {
    const decrypted = decryptField(stored);
    return decrypted ? normalizeCpf(decrypted) : null;
  }
  return normalizeCpf(stored);
}

async function reencryptPeople() {
  const people = await prisma.person.findMany({
    where: {
      OR: [{ cpfEncrypted: { not: null } }, { rgEncrypted: { not: null } }],
    },
    select: { id: true, cpfEncrypted: true, rgEncrypted: true, cpfHash: true },
  });

  let updated = 0;
  for (const person of people) {
    const updates: { cpfEncrypted?: string | null; cpfHash?: string | null; rgEncrypted?: string | null } = {};

    const normalizedCpf = readStoredCpf(person.cpfEncrypted);
    if (normalizedCpf) {
      const newEncrypted = encryptField(normalizedCpf);
      const newHash = hashCpf(normalizedCpf);
      // Só regrava se mudou (evita reescrever linhas já OK)
      if (person.cpfEncrypted !== newEncrypted || person.cpfHash !== newHash) {
        updates.cpfEncrypted = newEncrypted;
        updates.cpfHash = newHash;
      }
    }

    if (person.rgEncrypted && !looksEncrypted(person.rgEncrypted)) {
      updates.rgEncrypted = encryptField(person.rgEncrypted.trim());
    }

    if (Object.keys(updates).length === 0) continue;

    await prisma.person.update({ where: { id: person.id }, data: updates });
    updated++;
  }
  return updated;
}

async function reencryptCandidates() {
  const candidates = await prisma.applicationCandidate.findMany({
    where: {
      OR: [{ cpfEncrypted: { not: null } }, { rgEncrypted: { not: null } }],
    },
    select: { id: true, cpfEncrypted: true, rgEncrypted: true, cpfHash: true },
  });

  let updated = 0;
  for (const candidate of candidates) {
    const updates: { cpfEncrypted?: string | null; cpfHash?: string | null; rgEncrypted?: string | null } = {};

    const normalizedCpf = readStoredCpf(candidate.cpfEncrypted);
    if (normalizedCpf) {
      const newEncrypted = encryptField(normalizedCpf);
      const newHash = hashCpf(normalizedCpf);
      if (candidate.cpfEncrypted !== newEncrypted || candidate.cpfHash !== newHash) {
        updates.cpfEncrypted = newEncrypted;
        updates.cpfHash = newHash;
      }
    }

    if (candidate.rgEncrypted && !looksEncrypted(candidate.rgEncrypted)) {
      updates.rgEncrypted = encryptField(candidate.rgEncrypted.trim());
    }

    if (Object.keys(updates).length === 0) continue;

    await prisma.applicationCandidate.update({ where: { id: candidate.id }, data: updates });
    updated++;
  }
  return updated;
}

async function main() {
  console.log("Recriptografando PII (CPF/RG) e populando cpf_hash...");
  const people = await reencryptPeople();
  const candidates = await reencryptCandidates();
  console.log(`Concluído. Pessoas atualizadas: ${people}. Candidatos atualizados: ${candidates}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
