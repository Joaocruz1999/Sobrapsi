export type KanbanColumn = {
  status: string;
  label: string;
  matchStatuses: string[];
};

// Colunas visíveis no funil. "Recebida" absorve os estágios intermediários
// (submitted / in_review / complemented) que deixaram de ser colunas próprias.
// "Aprovado" e "Reprovado" deixaram de ser colunas — viraram botões de ação.
export const ADMIN_KANBAN_COLUMNS: KanbanColumn[] = [
  { status: "draft", label: "Rascunho", matchStatuses: ["draft"] },
  {
    status: "awaiting_review",
    label: "Recebida",
    matchStatuses: ["submitted", "awaiting_review", "in_review", "complemented"],
  },
  {
    status: "awaiting_complement",
    label: "Aguardando informações",
    matchStatuses: ["awaiting_complement"],
  },
  {
    status: "approved_pending_payment",
    label: "Aguardando pagamento",
    matchStatuses: ["approved_pending_payment"],
  },
];

// Status que a secretaria pode definir manualmente via update_status.
// Inclui approved/rejected (acionados pelos botões de arrastar) mesmo que
// não sejam colunas visíveis.
export const ADMIN_UPDATABLE_STATUSES = [
  "draft",
  "awaiting_review",
  "awaiting_complement",
  "approved_pending_payment",
  "approved",
  "rejected",
];

export function kanbanColumnForStatus(status: string): KanbanColumn {
  return (
    ADMIN_KANBAN_COLUMNS.find((col) => col.matchStatuses.includes(status)) ??
    ADMIN_KANBAN_COLUMNS[0]
  );
}

export function appsInColumn<T extends { status: string }>(
  applications: T[],
  column: KanbanColumn
): T[] {
  return applications.filter((app) => column.matchStatuses.includes(app.status));
}

// Limite de horas sem pagamento para destacar o card em vermelho.
export const PAYMENT_OVERDUE_HOURS = 48;
