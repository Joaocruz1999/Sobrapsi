import type { KanbanColumn } from "@/lib/admin-kanban";

export const SUPERVISION_PACKAGE_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  received: "Recebida",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  cancelled: "Cancelado",
};

export const SUPERVISION_PACKAGE_KANBAN_COLUMNS: KanbanColumn[] = [
  { status: "draft", label: "Rascunho", matchStatuses: ["draft"] },
  { status: "received", label: "Recebida", matchStatuses: ["received"] },
  {
    status: "awaiting_payment",
    label: "Aguardando pagamento",
    matchStatuses: ["awaiting_payment"],
  },
];

export const SUPERVISION_PACKAGE_UPDATABLE_STATUSES = [
  "draft",
  "received",
  "awaiting_payment",
  "paid",
  "cancelled",
] as const;

export type SupervisionPackageUpdatableStatus =
  (typeof SUPERVISION_PACKAGE_UPDATABLE_STATUSES)[number];

export function supervisionPackageKanbanColumnForStatus(status: string): KanbanColumn {
  return (
    SUPERVISION_PACKAGE_KANBAN_COLUMNS.find((col) =>
      col.matchStatuses.includes(status)
    ) ?? SUPERVISION_PACKAGE_KANBAN_COLUMNS[0]
  );
}
