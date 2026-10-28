"use client";

import { useMemo, useState } from "react";
import { GripVertical, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  appsInColumn,
  PAYMENT_OVERDUE_HOURS,
} from "@/lib/admin-kanban";
import {
  SUPERVISION_PACKAGE_KANBAN_COLUMNS,
  supervisionPackageKanbanColumnForStatus,
} from "@/lib/supervision-package-kanban";
import { formatDate } from "@/lib/utils";

export interface SupervisionPackageOrderItem {
  id: string;
  status: string;
  statusLabel: string;
  fullName: string;
  phone?: string | null;
  email: string;
  cpf?: string | null;
  amount: number;
  isMemberPrice: boolean;
  claimsMember: boolean;
  paymentId?: string | null;
  paymentStatus?: string | null;
  dueDate?: string | null;
  submittedAt: string;
  createdAt: string;
  registrationNumber?: string | null;
}

interface SupervisionPackageOrderDetail extends SupervisionPackageOrderItem {
  paidAt?: string | null;
}

function isPaymentOverdue(order: SupervisionPackageOrderItem) {
  if (order.status !== "awaiting_payment") return false;
  const ref = order.submittedAt ? new Date(order.submittedAt) : null;
  if (!ref) return false;
  const hours = (Date.now() - ref.getTime()) / (1000 * 60 * 60);
  return hours > PAYMENT_OVERDUE_HOURS;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm text-zinc-200">{value}</p>
    </div>
  );
}

function KanbanCard({
  order,
  onOpen,
  overdue = false,
}: {
  order: SupervisionPackageOrderItem;
  onOpen: () => void;
  overdue?: boolean;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", order.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onOpen}
      className={`w-full rounded-lg border p-3 text-left transition hover:border-primary/40 ${
        overdue
          ? "border-red-500/40 bg-red-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-white">{order.fullName}</p>
        <GripVertical className="h-4 w-4 shrink-0 text-zinc-500" />
      </div>
      <p className="text-xs text-muted">{order.cpf ?? "CPF não informado"}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {order.isMemberPrice ? "Associado R$ 200" : "Não associado R$ 400"}
        </Badge>
        <span className="text-xs text-zinc-400">R$ {order.amount.toFixed(0)}</span>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        {formatDate(order.submittedAt)}
      </p>
    </button>
  );
}

export function SupervisionPackageKanban({
  orders,
  loading,
  refreshing,
  actionLoading,
  onRefresh,
  onStatusChange,
}: {
  orders: SupervisionPackageOrderItem[];
  loading: boolean;
  refreshing: boolean;
  actionLoading: boolean;
  onRefresh: () => void;
  onStatusChange: (orderId: string, status: string) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupervisionPackageOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) =>
      [order.fullName, order.email, order.cpf, order.phone, order.registrationNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [orders, query]);

  async function openDetail(orderId: string) {
    setSelectedId(orderId);
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(`/api/admin/supervision-packages/${orderId}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    setDetailLoading(false);
    if (res.ok) setDetail(data.order);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, CPF, telefone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || refreshing || actionLoading}
          onClick={onRefresh}
        >
          {refreshing ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SUPERVISION_PACKAGE_KANBAN_COLUMNS.map((column) => {
          const columnOrders = appsInColumn(filtered, column);
          return (
            <div
              key={column.status}
              className="rounded-xl border border-white/10 bg-zinc-950/40 p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const orderId = e.dataTransfer.getData("text/plain");
                if (!orderId) return;
                const current = orders.find((item) => item.id === orderId);
                if (!current) return;
                if (
                  supervisionPackageKanbanColumnForStatus(current.status).status ===
                  column.status
                ) {
                  return;
                }
                await onStatusChange(orderId, column.status);
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{column.label}</h3>
                <Badge variant="outline">{columnOrders.length}</Badge>
              </div>
              <div className="space-y-2">
                {columnOrders.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted">
                    Nenhum pedido nesta etapa.
                  </p>
                ) : (
                  columnOrders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      overdue={isPaymentOverdue(order)}
                      onOpen={() => openDetail(order.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-zinc-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedido do grupo</DialogTitle>
          </DialogHeader>
          {detailLoading && <p className="text-sm text-muted">Carregando...</p>}
          {detail && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Nome" value={detail.fullName} />
                <DetailRow label="CPF" value={detail.cpf} />
                <DetailRow label="Telefone" value={detail.phone} />
                <DetailRow label="E-mail" value={detail.email} />
                <DetailRow
                  label="Valor"
                  value={`R$ ${detail.amount.toFixed(0)} (${
                    detail.isMemberPrice ? "associado" : "não associado"
                  })`}
                />
                <DetailRow label="Etapa" value={detail.statusLabel} />
                <DetailRow
                  label="Registro"
                  value={detail.registrationNumber}
                />
                <DetailRow
                  label="Pagamento"
                  value={
                    detail.paymentStatus
                      ? `${detail.paymentStatus}${
                          detail.paymentId ? ` · ${detail.paymentId.slice(0, 8)}` : ""
                        }`
                      : "Sem pagamento"
                  }
                />
                <DetailRow label="Enviado em" value={formatDate(detail.submittedAt)} />
                <DetailRow
                  label="Vencimento"
                  value={detail.dueDate ? formatDate(detail.dueDate) : null}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted">Mover para</p>
                <div className="flex flex-wrap gap-2">
                  {SUPERVISION_PACKAGE_KANBAN_COLUMNS.map((column) => (
                    <Button
                      key={column.status}
                      type="button"
                      size="sm"
                      variant={
                        supervisionPackageKanbanColumnForStatus(detail.status).status ===
                        column.status
                          ? "default"
                          : "outline"
                      }
                      disabled={actionLoading}
                      onClick={async () => {
                        await onStatusChange(detail.id, column.status);
                        setDetail({
                          ...detail,
                          status: column.status,
                          statusLabel: column.label,
                        });
                      }}
                    >
                      {column.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
