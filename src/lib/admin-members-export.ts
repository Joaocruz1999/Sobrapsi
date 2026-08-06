import "server-only";

import ExcelJS from "exceljs";
import type { AdminMemberItem } from "@/lib/admin-members";
import { formatDate } from "@/lib/utils";

const HEADERS = [
  "Nome",
  "E-mail",
  "Registro",
  "Categoria",
  "Status",
  "Validade",
  "Nascimento",
  "Cidade",
  "UF",
] as const;

function memberRows(members: AdminMemberItem[]) {
  return members.map((m) => [
    m.publicName,
    m.email,
    m.registrationNumber,
    m.categoryLabel,
    m.statusLabel,
    formatDate(m.validUntil),
    formatDate(m.birthDate),
    m.publicCity ?? "",
    m.publicState ?? "",
  ]);
}

function escapeCsvCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV com BOM + `;` para abrir corretamente no Excel PT-BR. */
export function buildMembersCsv(members: AdminMemberItem[]): string {
  const lines = [
    HEADERS.join(";"),
    ...memberRows(members).map((row) =>
      row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(";")
    ),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export async function buildMembersXlsx(members: AdminMemberItem[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Associados");

  sheet.addRow([...HEADERS]);
  sheet.getRow(1).font = { bold: true };

  for (const row of memberRows(members)) {
    sheet.addRow(row);
  }

  sheet.columns.forEach((column) => {
    let max = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    column.width = Math.min(max + 2, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
