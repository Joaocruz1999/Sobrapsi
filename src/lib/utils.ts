import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Exibe datas armazenadas como "meia-noite UTC" (campos de data-only, ex.: birthDate).
 * Usa timezone UTC para evitar deslocamento de 1 dia em fusos atrás do UTC
 * (ex.: 1976-12-30T00:00:00Z exibido em UTC-3 viraria 29/12 sem UTC).
 * Usar SOMENTE para campos de data-only; para timestamps reais (submetido em,
 * pago em, etc.) use `formatDate` para preservar o dia local do evento.
 */
export function formatDateUTC(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatRegistrationNumber(seq: number): string {
  return `SBR-${String(seq).padStart(6, "0")}`;
}
