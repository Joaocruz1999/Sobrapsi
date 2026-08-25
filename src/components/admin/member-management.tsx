"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { MEMBER_STATUSES, type MemberCategory } from "@/lib/member-types";
import { DOCUMENT_TYPES } from "@/lib/application-shared";
import { formatDate } from "@/lib/utils";

export interface AdminMemberItem {
  id: string;
  userId: string;
  email: string;
  publicName: string;
  registrationNumber: string;
  category: MemberCategory;
  categoryLabel: string;
  status: string;
  statusLabel: string;
  validUntil?: string | null;
  birthDate?: string | null;
  cpf?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
}

interface MemberManagementProps {
  members: AdminMemberItem[];
  loading: boolean;
  actionLoading: boolean;
  onRefresh: () => void;
}

interface EditForm {
  fullName: string;
  email: string;
  publicName: string;
  category: MemberCategory;
  validUntil: string;
  publicCity: string;
  publicState: string;
  publicBio: string;
  isPublic: boolean;
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

interface MemberDetail {
  id: string;
  userId: string;
  email: string;
  publicName: string;
  fullName: string;
  registrationNumber: string;
  category: MemberCategory;
  status: string;
  validUntil?: string | null;
  birthDate?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  publicBio?: string | null;
  isPublic?: boolean;
  cpf?: string | null;
  rg?: string | null;
  nationality?: string | null;
  phone?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  profession?: string | null;
  institution?: string | null;
  practiceCity?: string | null;
  studyAreas?: string | null;
  documents?: {
    id: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    createdAt: string;
  }[];
}

function documentLabel(type: string) {
  return DOCUMENT_TYPES.find((d) => d.id === type)?.label ?? type;
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

function MemberDetailDialog({
  open,
  onOpenChange,
  detail,
  loading,
  onOpenDocument,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: MemberDetail | null;
  loading: boolean;
  onOpenDocument: (documentId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader className="gap-0 border-b border-white/10 pb-6 pr-10">
            <DialogTitle className="truncate">
              {detail?.fullName || detail?.publicName || "Associado"}
            </DialogTitle>
            {detail && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">{detail.registrationNumber}</Badge>
                <Badge variant="outline">
                  {CATEGORY_LABELS[detail.category] ?? detail.category}
                </Badge>
                <Badge>
                  {STATUS_LABELS[detail.status as keyof typeof STATUS_LABELS] ?? detail.status}
                </Badge>
                {detail.validUntil && (
                  <Badge variant="outline">
                    Válido até {formatDate(detail.validUntil)}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {loading && (
            <p className="mt-6 text-sm text-muted">Carregando dados do associado...</p>
          )}

          {detail && !loading && (
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Dados pessoais</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Nome completo" value={detail.fullName} />
                  <DetailRow label="Nome público" value={detail.publicName} />
                  <DetailRow label="E-mail" value={detail.email} />
                  <DetailRow label="CPF" value={detail.cpf} />
                  <DetailRow label="RG" value={detail.rg} />
                  <DetailRow
                    label="Nascimento"
                    value={detail.birthDate ? formatDate(detail.birthDate) : null}
                  />
                  <DetailRow label="Nacionalidade" value={detail.nationality} />
                  <DetailRow label="Telefone" value={detail.phone} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Endereço</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Logradouro" value={detail.address} />
                  <DetailRow label="Número" value={detail.addressNumber} />
                  <DetailRow
                    label="Cidade/UF"
                    value={
                      detail.city && detail.state
                        ? `${detail.city} / ${detail.state}`
                        : detail.city ?? detail.state
                    }
                  />
                  <DetailRow label="CEP" value={detail.zipCode} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Dados profissionais</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Profissão" value={detail.profession} />
                  <DetailRow label="Instituição" value={detail.institution} />
                  <DetailRow label="Cidade de atuação" value={detail.practiceCity} />
                  <DetailRow label="Áreas de atuação" value={detail.studyAreas} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Perfil público</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow
                    label="Cidade pública"
                    value={detail.publicCity}
                  />
                  <DetailRow
                    label="Estado público"
                    value={detail.publicState}
                  />
                  <DetailRow label="Bio pública" value={detail.publicBio} />
                  <DetailRow
                    label="Visível na consulta pública"
                    value={detail.isPublic ? "Sim" : "Não"}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Documentos</h3>
                {!detail.documents || detail.documents.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum documento enviado.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detail.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">
                            {documentLabel(doc.documentType)}
                          </p>
                          <p className="truncate text-xs text-muted">{doc.fileName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenDocument(doc.id)}
                          className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MemberManagement({
  members,
  loading,
  actionLoading,
  onRefresh,
}: MemberManagementProps) {
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [exporting, setExporting] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<MemberDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  async function openEdit(memberId: string) {
    setError("");
    const res = await fetch(`/api/admin/members/${memberId}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Não foi possível carregar o associado.");
      return;
    }

    const member = data.member;
    setEditingId(memberId);
    setForm({
      fullName: member.fullName,
      email: member.email,
      publicName: member.publicName,
      category: member.category,
      validUntil: toDateInput(member.validUntil),
      publicCity: member.publicCity ?? "",
      publicState: member.publicState ?? "",
      publicBio: member.publicBio ?? "",
      isPublic: member.isPublic ?? false,
    });
  }

  async function openView(memberId: string) {
    setViewingId(memberId);
    setViewDetail(null);
    setViewLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setViewDetail(data.member);
      }
    } finally {
      setViewLoading(false);
    }
  }

  async function openDocument(documentId: string) {
    const res = await fetch(`/api/admin/documents/${documentId}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function runAction(memberId: string, payload: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Não foi possível concluir a ação.");
      return false;
    }
    onRefresh();
    return true;
  }

  async function handleSuspend(memberId: string) {
    if (!confirm("Suspender este associado?")) return;
    await runAction(memberId, { action: "suspend" });
  }

  async function handleActivate(memberId: string) {
    await runAction(memberId, { action: "activate" });
  }

  async function handleResetPassword(memberId: string) {
    if (
      !confirm(
        "Redefinir a senha para a data de nascimento? O associado precisará alterá-la no próximo login."
      )
    ) {
      return;
    }
    await runAction(memberId, { action: "resetPassword" });
  }

  async function handleDelete(memberId: string, name: string) {
    if (!confirm(`Excluir permanentemente o associado ${name}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setError("");
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Não foi possível excluir o associado.");
      return;
    }
    setEditingId(null);
    setForm(null);
    onRefresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !form) return;

    const ok = await runAction(editingId, {
      action: "update",
      fullName: form.fullName,
      email: form.email,
      publicName: form.publicName,
      category: form.category,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
      publicCity: form.publicCity || null,
      publicState: form.publicState || null,
      publicBio: form.publicBio || null,
      isPublic: form.isPublic,
    });

    if (ok) {
      setEditingId(null);
      setForm(null);
    }
  }

  async function handleExport(format: "csv" | "xlsx") {
    setError("");
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/members/export?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível a exportação.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `associados.${format === "csv" ? "csv" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }
  const visibleMembers = useMemo(() => {
    const byStatus =
      statusFilter === "all"
        ? members
        : members.filter((m) => m.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    const qDigits = q.replace(/\D/g, "");
    return byStatus.filter((m) => {
      if (m.publicName?.toLowerCase().includes(q)) return true;
      if (m.email?.toLowerCase().includes(q)) return true;
      if (m.registrationNumber?.toLowerCase().includes(q)) return true;
      if (m.cpf && qDigits && m.cpf.replace(/\D/g, "").includes(qDigits)) return true;
      return false;
    });
  }, [members, statusFilter, query]);

  if (loading) {
    return <p className="text-muted">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {editingId && form && (
        <Card className="border-primary/30 bg-zinc-900/50">
          <CardHeader>
            <CardTitle>Editar associado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nome público</Label>
                <Input
                  value={form.publicName}
                  onChange={(e) => setForm({ ...form, publicName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select
                  className="flex h-11 w-full rounded-lg border border-white/20 bg-transparent px-3 text-sm text-white"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as MemberCategory })
                  }
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-zinc-900">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.publicCity}
                  onChange={(e) => setForm({ ...form, publicCity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={form.publicState}
                  onChange={(e) => setForm({ ...form, publicState: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Bio pública</Label>
                <textarea
                  className="min-h-24 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white"
                  value={form.publicBio}
                  onChange={(e) => setForm({ ...form, publicBio: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                />
                Perfil visível na consulta pública
              </label>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <Button type="submit" disabled={actionLoading}>
                  Salvar alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10 bg-zinc-900/50">
        <CardHeader className="space-y-4">
          <CardTitle>Associados cadastrados</CardTitle>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2">
              <Label htmlFor="export-status" className="block text-center">
                Filtrar status
              </Label>
              <select
                id="export-status"
                className="h-11 appearance-none rounded-lg border border-white/20 bg-transparent bg-[length:12px_12px] bg-[position:right_0.65rem_center] bg-no-repeat px-3 pr-8 text-center text-sm text-white"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all" className="bg-zinc-900">
                  Todos
                </option>
                {MEMBER_STATUSES.map((status) => (
                  <option key={status} value={status} className="bg-zinc-900">
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative max-w-xs flex-1 min-w-[16rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, e-mail, registro ou CPF"
                className="pl-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-muted hover:text-white"
                >
                  limpar
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="export-format" className="block text-center">
                  Formato
                </Label>
                <select
                  id="export-format"
                  className="h-11 appearance-none rounded-lg border border-white/20 bg-transparent bg-[length:12px_12px] bg-[position:right_0.65rem_center] bg-no-repeat px-3 pr-8 text-center text-sm text-white"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                  }}
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as "csv" | "xlsx")}
                >
                  <option value="csv" className="bg-zinc-900">
                    CSV
                  </option>
                  <option value="xlsx" className="bg-zinc-900">
                    XLSX
                  </option>
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={exporting || actionLoading}
                onClick={() => handleExport(exportFormat)}
              >
                {exporting ? "Exportando..." : "Exportar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleMembers.length === 0 ? (
            <p className="text-muted">
              {statusFilter === "all"
                ? "Nenhum associado no banco."
                : "Nenhum associado com este status."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-muted">
                    <th className="pb-3 pr-4">Nome</th>
                    <th className="pb-3 pr-4">Registro</th>
                    <th className="pb-3 pr-4">Categoria</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Validade</th>
                    <th className="pb-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((member) => (
                    <tr key={member.id} className="border-b border-white/5 align-top">
                      <td className="py-3 pr-4 text-white">{member.publicName}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{member.registrationNumber}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{member.categoryLabel}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={member.status === "active" ? "success" : "warning"}>
                          {member.statusLabel}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {formatDate(member.validUntil ?? null)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openView(member.id)}>
                            Ver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(member.id)}>
                            Editar
                          </Button>
                          {member.status === "suspended" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => handleActivate(member.id)}
                            >
                              Reativar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => handleSuspend(member.id)}
                            >
                              Suspender
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => handleResetPassword(member.id)}
                          >
                            Resetar senha
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => handleDelete(member.id, member.publicName)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MemberDetailDialog
        open={viewingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingId(null);
            setViewDetail(null);
          }
        }}
        detail={viewDetail}
        loading={viewLoading}
        onOpenDocument={openDocument}
      />
    </div>
  );
}
