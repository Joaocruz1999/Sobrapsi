import { decryptField, encryptField, hashCpf } from "@/lib/crypto";
import { formatCpfInput, normalizeCpf } from "@/lib/application-shared";

export interface CpfWritePayload {
  cpfEncrypted: string | null;
  cpfHash: string | null;
}

export interface RgWritePayload {
  rgEncrypted: string | null;
}

/**
 * Prepara o CPF para gravação: criptografa o valor e calcula o hash de lookup.
 * Retorna `null` para ambos quando o CPF de entrada é vazio.
 */
export function prepareCpfForStorage(rawCpf: string | null | undefined): CpfWritePayload {
  if (!rawCpf) return { cpfEncrypted: null, cpfHash: null };
  const normalized = normalizeCpf(rawCpf);
  if (!normalized) return { cpfEncrypted: null, cpfHash: null };
  return {
    cpfEncrypted: encryptField(normalized),
    cpfHash: hashCpf(normalized),
  };
}

/** Criptografa RG (sem hash — não há lookup por RG). */
export function prepareRgForStorage(rawRg: string | null | undefined): RgWritePayload {
  if (!rawRg) return { rgEncrypted: null };
  const trimmed = String(rawRg).trim();
  if (!trimmed) return { rgEncrypted: null };
  return { rgEncrypted: encryptField(trimmed) };
}

/** Descriptografa o CPF armazenado. Retorna o CPF normalizado (somente dígitos) ou `null`. */
export function readCpf(stored: string | null | undefined): string | null {
  const decrypted = decryptField(stored);
  if (!decrypted) return null;
  return normalizeCpf(decrypted);
}

/** Descriptografa o RG armazenado. */
export function readRg(stored: string | null | undefined): string | null {
  return decryptField(stored);
}

/**
 * Compara um CPF de entrada com o CPF armazenado (criptografado).
 * Usa o hash quando disponível; faz fallback descriptografando caso contrário.
 */
export function cpfStoredMatches(
  storedCpfEncrypted: string | null | undefined,
  storedCpfHash: string | null | undefined,
  inputCpf: string
): boolean {
  const normalized = normalizeCpf(inputCpf);
  if (normalized.length !== 11) return false;
  if (storedCpfHash) {
    return storedCpfHash === hashCpf(normalized);
  }
  const stored = readCpf(storedCpfEncrypted);
  return Boolean(stored) && stored === normalized;
}

/** Descriptografa e formata o CPF para exibição (ex.: `011.452.929-92`). */
export function formatCpfForDisplay(stored: string | null | undefined): string | null {
  const cpf = readCpf(stored);
  if (!cpf) return null;
  return formatCpfInput(cpf);
}

/** Descriptografa o RG para exibição. */
export function formatRgForDisplay(stored: string | null | undefined): string | null {
  return readRg(stored);
}

/**
 * Retorna uma shallow copy de um objeto Person/Candidate com `cpfEncrypted`/`rgEncrypted`
 * substituídos pelos valores descriptografados formatados para exibição.
 * Mantém o nome dos campos para preservar o contrato das APIs e componentes existentes.
 */
export function withDecryptedPiiForDisplay<
  T extends { cpfEncrypted?: string | null; rgEncrypted?: string | null }
>(record: T | null | undefined): T | null | undefined {
  if (!record) return record;
  return {
    ...record,
    cpfEncrypted: formatCpfForDisplay(record.cpfEncrypted),
    rgEncrypted: formatRgForDisplay(record.rgEncrypted),
  };
}
