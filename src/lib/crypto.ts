import {
  createCipheriv,
  createHmac,
  createDecipheriv,
  randomBytes,
} from "crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY não configurada — defina uma chave hex de 32 bytes (64 caracteres)."
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY inválida — esperado ${KEY_BYTES} bytes, recebido ${key.length}.`
    );
  }
  return key;
}

function isConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Criptografa um valor textual com AES-256-GCM.
 * Retorna uma string `iv:tag:ciphertext` em base64url-safe (hex aqui para simplicidade).
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), ciphertext.toString("hex")].join(":");
}

/**
 * Descriptografa um valor produzido por `encryptField`.
 * Retorna `null` se o valor estiver vazio ou em formato inválido.
 */
export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const parts = stored.split(":");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const ciphertext = Buffer.from(parts[2], "hex");
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Hash determinístico (HMAC-SHA256) para lookup por CPF sem expor o valor.
 * Permite `WHERE cpf_hash = hashCpf(cpf)` sem descriptografar a tabela inteira.
 */
export function hashCpf(normalizedCpf: string): string {
  const key = getKey();
  return createHmac("sha256", key).update(`cpf:${normalizedCpf}`).digest("hex");
}

export { isConfigured as isEncryptionConfigured };
