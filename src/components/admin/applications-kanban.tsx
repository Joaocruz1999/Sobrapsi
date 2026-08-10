"use client";

import { useState } from "react";
import { ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_KANBAN_COLUMNS, PAYMENT_OVERDUE_HOURS, appsInColumn, kanbanColumnForStatus } from "@/lib/admin-kanban";
import { DOCUMENT_TYPES } from "@/lib/application-shared";
import {
  EDUCATION_COURSE_TYPES,
  labelAttendingCourseType,
  labelAttendingInstitution,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export interface ApplicationListItem {
  id: string;
  status: string;
  statusLabel: string;
  categoryLabel: string;
  candidateName: string;
  candidateEmail: string;
  submittedAt?: string;
  reviewedAt?: string | null;
  documentsCount: number;
}

interface ApplicationDetail {
  id: string;
  status: string;
  statusLabel: string;
  categoryLabel: string;
  submittedAt?: string | null;
  attendingCourseType?: string | null;
  attendingInstitution?: string | null;
  attendingInstitutionOther?: string | null;
  person: {
    fullName?: string;
    email?: string;
    cpfEncrypted?: string | null;
    rgEncrypted?: string | null;
    birthDate?: string | null;
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
  } | null;
  documents: {
    id: string;
    documentType: string;
    fileName: string;
    mimeType: string;
  }[];
  educationRecords: {
    institution: string;
    courseName: string;
    courseType?: string | null;
    status?: string | null;
    workload?: number | null;
    endDate?: string | null;
  }[];
  curriculumRecord?: {
    summary?: string | null;
    clinicalExperience?: string | null;
    analysisHours?: number | null;
    analystName?: string | null;
    supervisionHours?: number | null;
    supervisorName?: string | null;
  } | null;
  publicProfileDraft?: {
    publicName?: string;
    publicBio?: string | null;
  } | null;
  adminNotes: { id: string; note: string; createdAt: string; visibility: string }[];
}

function educationCourseTypeLabel(id?: string | null) {
  return EDUCATION_COURSE_TYPES.find((item) => item.id === id)?.label ?? id ?? null;
}

function educationStatusLabel(status?: string | null) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "concluido") return "Concluído";
  return status ?? null;
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

function KanbanCard({
  app,
  onOpen,
  overdue = false,
}: {
  app: ApplicationListItem;
  onOpen: () => void;
  overdue?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/id", app.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`rounded-lg border bg-zinc-950/80 ${
        overdue ? "border-red-500/60 bg-red-500/10" : "border-white/10"
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{app.candidateName}</p>
          <p className="truncate text-xs text-muted">{app.candidateEmail}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">
              {app.categoryLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {app.documentsCount} docs
            </Badge>
            {overdue && (
              <Badge variant="outline" className="border-red-500/60 text-[10px] text-red-300">
                Pagamento atrasado
              </Badge>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            Abrir candidatura
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApplicationDetailDialog({
  app,
  detail,
  loading,
  open,
  onOpenChange,
  actionLoading,
  statusChanging,
  onAction,
  onOpenDocument,
  onStatusChange,
}: {
  app: ApplicationListItem | null;
  detail: ApplicationDetail | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  statusChanging: boolean;
  onAction: (action: string, extra?: Record<string, string>) => void;
  onOpenDocument: (documentId: string) => void;
  onStatusChange: (status: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [complementNote, setComplementNote] = useState("");
  const [formType, setFormType] = useState<"reject" | "complement" | null>(null);

  const canAct =
    app &&
    ["submitted", "awaiting_review", "in_review", "complemented", "awaiting_complement"].includes(
      app.status
    );

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setFormType(null);
      setRejectReason("");
      setComplementNote("");
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader className="gap-0 border-b border-white/10 pb-6 pr-10">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="min-w-0 truncate">
                {app?.candidateName ?? "Candidatura"}
              </DialogTitle>
              {app && (
                <div className="shrink-0">
                  <label
                    htmlFor="application-stage-select"
                    className="block text-[10px] font-medium uppercase tracking-wide text-muted"
                  >
                    Etapa
                  </label>
                  <select
                    id="application-stage-select"
                    value={kanbanColumnForStatus(app.status).status}
                    disabled={statusChanging || actionLoading}
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      if (nextStatus !== kanbanColumnForStatus(app.status).status) {
                        onStatusChange(nextStatus);
                      }
                    }}
                    className="mt-1 w-44 rounded-md border border-white/15 bg-zinc-900 px-2 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    {ADMIN_KANBAN_COLUMNS.map((column) => (
                      <option key={column.status} value={column.status}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {app && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">{app.categoryLabel}</Badge>
                <Badge>{app.statusLabel}</Badge>
                {detail?.submittedAt && (
                  <Badge variant="outline">Enviada em {formatDate(detail.submittedAt)}</Badge>
                )}
              </div>
            )}
          </DialogHeader>

        {loading && <p className="mt-6 text-sm text-muted">Carregando dados da candidatura...</p>}

        {detail && !loading && (
          <div className="mt-6 space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Dados pessoais</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Nome" value={detail.person?.fullName} />
                <DetailRow label="E-mail" value={detail.person?.email} />
                <DetailRow label="CPF" value={detail.person?.cpfEncrypted} />
                <DetailRow label="RG" value={detail.person?.rgEncrypted} />
                <DetailRow
                  label="Nascimento"
                  value={detail.person?.birthDate ? formatDate(detail.person.birthDate) : null}
                />
                <DetailRow label="Nacionalidade" value={detail.person?.nationality} />
                <DetailRow label="Telefone" value={detail.person?.phone} />
                <DetailRow
                  label="Cidade/UF"
                  value={
                    detail.person?.city && detail.person?.state
                      ? `${detail.person.city} / ${detail.person.state}`
                      : detail.person?.city ?? detail.person?.state
                  }
                />
                <DetailRow label="Endereço" value={detail.person?.address} />
                <DetailRow label="Número" value={detail.person?.addressNumber} />
                <DetailRow label="CEP" value={detail.person?.zipCode} />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Estudos atuais</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  label="Tipo de curso que frequenta"
                  value={labelAttendingCourseType(detail.attendingCourseType)}
                />
                <DetailRow
                  label="Instituição onde estuda"
                  value={labelAttendingInstitution(
                    detail.attendingInstitution,
                    detail.attendingInstitutionOther
                  )}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Dados de formação</h3>
              {detail.educationRecords.length === 0 ? (
                <p className="text-sm text-muted">Nenhum registro de formação.</p>
              ) : (
                <div className="space-y-3">
                  {detail.educationRecords.map((edu, i) => (
                    <div key={i} className="rounded-md border border-white/10 p-3">
                      <p className="text-sm text-zinc-200">
                        {edu.courseName} — {edu.institution}
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <DetailRow
                          label="Tipo de curso"
                          value={educationCourseTypeLabel(edu.courseType)}
                        />
                        <DetailRow label="Status" value={educationStatusLabel(edu.status)} />
                        <DetailRow
                          label="Ano de conclusão"
                          value={edu.endDate ? formatDate(edu.endDate) : null}
                        />
                        <DetailRow
                          label="Horas do curso"
                          value={edu.workload ? `${edu.workload} h` : null}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {detail.curriculumRecord &&
              (detail.curriculumRecord.analysisHours != null ||
                detail.curriculumRecord.analystName ||
                detail.curriculumRecord.supervisionHours != null ||
                detail.curriculumRecord.supervisorName) && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-white">Tripé psicanalítico</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow
                      label="Horas de análise"
                      value={
                        detail.curriculumRecord.analysisHours != null
                          ? String(detail.curriculumRecord.analysisHours)
                          : null
                      }
                    />
                    <DetailRow label="Nome do analista" value={detail.curriculumRecord.analystName} />
                    <DetailRow
                      label="Horas de supervisão"
                      value={
                        detail.curriculumRecord.supervisionHours != null
                          ? String(detail.curriculumRecord.supervisionHours)
                          : null
                      }
                    />
                    <DetailRow
                      label="Nome do supervisor"
                      value={detail.curriculumRecord.supervisorName}
                    />
                  </div>
                </section>
              )}

            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Dados profissionais</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Profissão" value={detail.person?.profession} />
                <DetailRow label="Instituição" value={detail.person?.institution} />
                <DetailRow label="Cidade de atuação" value={detail.person?.practiceCity} />
                <DetailRow label="Áreas de atuação" value={detail.person?.studyAreas} />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-white">Documentos</h3>
              {detail.documents.length === 0 ? (
                <p className="text-sm text-muted">Nenhum documento enviado.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {detail.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2"
                    >
                      <p className="text-sm text-white">{documentLabel(doc.documentType)}</p>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir documento
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {detail.adminNotes.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Notas administrativas</h3>
                <div className="space-y-2">
                  {detail.adminNotes.map((note) => (
                    <p key={note.id} className="rounded-md border border-white/10 px-3 py-2 text-sm text-muted">
                      <span className="text-xs text-primary">{formatDate(note.createdAt)}</span>
                      <br />
                      {note.note}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {canAct && (
              <section className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white">Ações</h3>
                <div className="flex flex-wrap gap-2">
                  {app?.status === "awaiting_review" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => onAction("start_review")}
                    >
                      Iniciar verificação
                    </Button>
                  )}
                  <Button size="sm" disabled={actionLoading} onClick={() => onAction("approve")}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={() => onAction("approve_exempt")}
                  >
                    Aprovar (isento)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setFormType("reject")}>
                    Reprovar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setFormType("complement")}>
                    Complementar
                  </Button>
                </div>

                {formType === "reject" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo interno (obrigatório)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || !rejectReason}
                      onClick={() => {
                        onAction("reject", { reasonInternal: rejectReason });
                        setFormType(null);
                      }}
                    >
                      Confirmar reprovação
                    </Button>
                  </div>
                )}

                {formType === "complement" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Itens pendentes / orientações"
                      value={complementNote}
                      onChange={(e) => setComplementNote(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || !complementNote}
                      onClick={() => {
                        onAction("complement", { note: complementNote });
                        setFormType(null);
                      }}
                    >
                      Solicitar complementação
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isPaymentOverdue(app: ApplicationListItem): boolean {
  if (app.status !== "approved_pending_payment") return false;
  const ref = app.reviewedAt ? new Date(app.reviewedAt) : null;
  if (!ref) return false;
  const hours = (Date.now() - ref.getTime()) / (1000 * 60 * 60);
  return hours > PAYMENT_OVERDUE_HOURS;
}

type RejectedApplication = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
};

function RejectedApplicationsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [items, setItems] = useState<RejectedApplication[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/applications?status=rejected", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.applications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) load();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle>Candidaturas reprovadas</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="mt-4 text-sm text-muted">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nenhuma candidatura reprovada.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {items.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="truncate text-sm font-medium text-white">
                    {a.candidateName}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {a.candidateEmail}
                    {a.submittedAt && ` · enviada em ${formatDate(a.submittedAt)}`}
                    {a.reviewedAt && ` · analisada em ${formatDate(a.reviewedAt)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ApplicationsKanban({
  applications,
  loading,
  refreshing = false,
  actionLoading,
  onRefresh,
  onAction,
  onStatusChange,
  onGoToMembers,
}: {
  applications: ApplicationListItem[];
  loading: boolean;
  refreshing?: boolean;
  actionLoading: boolean;
  onRefresh: () => void;
  onAction: (applicationId: string, action: string, extra?: Record<string, string>) => void;
  onStatusChange: (applicationId: string, status: string) => void;
  onGoToMembers?: () => void;
}) {
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ApplicationDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverAction, setDragOverAction] = useState<string | null>(null);
  const [rejectedOpen, setRejectedOpen] = useState(false);

  const openApp = applications.find((a) => a.id === openAppId) ?? null;

  async function openApplication(applicationId: string) {
    setOpenAppId(applicationId);

    if (details[applicationId]) return;

    setDetailLoading(true);
    const res = await fetch(`/api/admin/applications/${applicationId}`, {
      credentials: "include",
    });
    setDetailLoading(false);

    if (res.ok) {
      const data = await res.json();
      setDetails((prev) => ({ ...prev, [applicationId]: data.application }));
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

  function handleDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault();
    setDragOverColumn(null);
    const applicationId = e.dataTransfer.getData("application/id");
    if (!applicationId) return;

    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;

    const column = ADMIN_KANBAN_COLUMNS.find((c) => c.status === targetStatus);
    if (column?.matchStatuses.includes(app.status)) return;

    onStatusChange(applicationId, targetStatus);
  }

  function handleActionDrop(e: React.DragEvent, action: string) {
    e.preventDefault();
    setDragOverAction(null);
    const applicationId = e.dataTransfer.getData("application/id");
    if (!applicationId) return;
    onAction(applicationId, action);
  }

  function handleApproveDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverAction(null);
    const applicationId = e.dataTransfer.getData("application/id");
    if (!applicationId) return;
    onStatusChange(applicationId, "approved");
  }

  if (loading) {
    return <p className="text-muted">Carregando candidaturas...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Arraste os cards entre as colunas. Arraste para <strong>Aprovado</strong> ou <strong>Reprovado</strong> para decidir a candidatura.
          {refreshing && <span className="ml-2 text-primary">Atualizando...</span>}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={`shadow-none border-green-500/40 bg-green-500/15 text-green-200 hover:bg-green-500/25 ${
              dragOverAction === "approve" ? "ring-2 ring-green-400" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverAction("approve");
            }}
            onDragLeave={() => setDragOverAction(null)}
            onDrop={handleApproveDrop}
            onClick={() => onGoToMembers?.()}
          >
            Aprovado
          </Button>
          <Button
            size="sm"
            className={`shadow-none border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 ${
              dragOverAction === "reject" ? "ring-2 ring-red-400" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverAction("reject");
            }}
            onDragLeave={() => setDragOverAction(null)}
            onDrop={(e) => handleActionDrop(e, "reject")}
            onClick={() => setRejectedOpen(true)}
          >
            Reprovado
          </Button>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            Atualizar
          </Button>
        </div>
      </div>

      <ApplicationDetailDialog
        app={openApp}
        detail={openAppId ? details[openAppId] ?? null : null}
        loading={detailLoading}
        open={openAppId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenAppId(null);
        }}
        actionLoading={actionLoading}
        statusChanging={statusChanging}
        onAction={(action, extra) => {
          if (openAppId) {
            onAction(openAppId, action, extra);
            setOpenAppId(null);
          }
        }}
        onOpenDocument={openDocument}
        onStatusChange={async (status) => {
          if (!openAppId) return;
          setStatusChanging(true);
          try {
            await onStatusChange(openAppId, status);
            setDetails((prev) => {
              const current = prev[openAppId];
              if (!current) return prev;
              const column = ADMIN_KANBAN_COLUMNS.find((c) => c.status === status);
              return {
                ...prev,
                [openAppId]: {
                  ...current,
                  status,
                  statusLabel: column?.label ?? current.statusLabel,
                },
              };
            });
          } finally {
            setStatusChanging(false);
          }
        }}
      />

      <RejectedApplicationsDialog open={rejectedOpen} onOpenChange={setRejectedOpen} />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {ADMIN_KANBAN_COLUMNS.map((column) => {
          const columnApps = appsInColumn(applications, column);
          const isDragOver = dragOverColumn === column.status;

          return (
            <div
              key={column.status}
              className={`flex min-w-[18rem] flex-1 flex-col rounded-xl border bg-zinc-900/40 ${
                isDragOver ? "border-primary bg-primary/5" : "border-white/10"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(column.status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className="border-b border-white/10 px-3 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{column.label}</h3>
                  <Badge variant="outline">{columnApps.length}</Badge>
                </div>
              </div>

              <div className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto p-2">
                {columnApps.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">Vazio</p>
                ) : (
                  columnApps.map((app) => (
                    <KanbanCard
                      key={app.id}
                      app={app}
                      overdue={isPaymentOverdue(app)}
                      onOpen={() => openApplication(app.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
