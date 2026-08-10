"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero, Section } from "@/components/layout/sections";
import { BRAZILIAN_STATES, EDUCATION_COURSE_TYPES, ATTENDING_COURSE_TYPES, ATTENDING_INSTITUTIONS } from "@/lib/constants";
import { PracticeAreasPicker, formatStudyAreas } from "@/components/portal/practice-areas-picker";
import { getApplicationStepsForCategory, getApplicationStepIndex } from "@/lib/application-steps";
import {
  DOCUMENT_TYPES,
  formatCpfInput,
  isValidCpf,
  normalizeCpf,
  optionalDocumentsForCategory,
  requiredDocumentsForCategory,
} from "@/lib/application-shared";
import type { MemberCategory } from "@/lib/member-types";
import { ConsentDocumentDialog } from "@/components/portal/consent-document-dialog";
import { CANDIDATURE_CONSENT_ITEMS } from "@/lib/consent-documents";
import type { ConsentDocumentId } from "@/lib/consent-documents";

const CANDIDATURE_CATEGORY_OPTIONS = [
  {
    id: "student" as const,
    title: "Associado Estudante",
    description:
      "Para alunos em formação psicanalítica ou graduação relacionada ao campo psicanalítico.",
  },
  {
    id: "psychoanalyst" as const,
    title: "Associado Psicanalista",
    description:
      "Para profissionais que concluíram formação em psicanálise e desejam integrar a sociedade.",
  },
];

type ApplicationData = {
  id: string;
  status: string;
  categoryRequested: MemberCategory;
  currentStep: number;
  attendingCourseType?: string | null;
  attendingInstitution?: string | null;
  attendingInstitutionOther?: string | null;
  documents: { id: string; documentType: string; fileName: string }[];
  educationRecords: {
    institution: string;
    courseName: string;
    courseType?: string | null;
    status?: string | null;
    workload?: number | null;
    endDate?: string | null;
  }[];
  curriculumRecord?: {
    summary?: string;
    analysisHours?: number | null;
    analystName?: string | null;
    supervisionHours?: number | null;
    supervisorName?: string | null;
  } | null;
  publicProfileDraft?: {
    publicName: string;
    authorizeList: boolean;
    profilePhotoPath?: string | null;
  } | null;
  candidate?: {
    fullName: string;
    email: string;
    nationality?: string | null;
    rgEncrypted?: string | null;
    rgIssuer?: string | null;
    cpfEncrypted?: string | null;
    birthDate?: string | null;
    address?: string | null;
    addressNumber?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    studyAreas?: string | null;
  } | null;
};

type CpfGateState =
  | { type: "idle" }
  | { type: "blocked"; message: string; eligibleAt?: string }
  | { type: "track"; message: string; statusLabel?: string }
  | { type: "approved"; message: string }
  | { type: "ready_create"; message: string }
  | { type: "ready_resume"; message: string; statusLabel?: string };

function applyApplicationToState(
  app: ApplicationData,
  setApplication: (app: ApplicationData) => void,
  setStep: (step: number) => void,
  setPerson: (person: Record<string, string>) => void,
  cpfPrefill?: string
) {
  setApplication(app);
  const steps = getApplicationStepsForCategory(app.categoryRequested);
  const maxStep = steps.length;
  const savedIndex = steps.findIndex((item) => item.key === getStepKeyFromSavedProgress(app));
  setStep(savedIndex >= 0 ? savedIndex + 1 : Math.min(app.currentStep, maxStep));
  if (app.candidate) {
    const c = app.candidate;
    setPerson({
      fullName: c.fullName ?? "",
      email: c.email ?? "",
      nationality: c.nationality ?? "Brasil",
      rg: c.rgEncrypted ?? "",
      cpf: c.cpfEncrypted ? formatCpfInput(c.cpfEncrypted) : cpfPrefill ?? "",
      birthDate: c.birthDate ? c.birthDate.slice(0, 10) : "",
      address: c.address ?? "",
      addressNumber: c.addressNumber ?? "",
      city: c.city ?? "",
      state: c.state ?? "PR",
      zipCode: c.zipCode ?? "",
      phone: c.phone ?? "",
    });
  } else if (cpfPrefill) {
    setPerson({ cpf: cpfPrefill });
  }
}

function getStepKeyFromSavedProgress(app: ApplicationData) {
  if (app.currentStep >= getApplicationStepIndex(app.categoryRequested, "consents")) {
    return "consents";
  }
  if (app.currentStep >= getApplicationStepIndex(app.categoryRequested, "documents")) {
    return "documents";
  }
  if (app.currentStep >= getApplicationStepIndex(app.categoryRequested, "professional")) {
    return "professional";
  }
  if (
    app.categoryRequested === "psychoanalyst" &&
    app.currentStep >= getApplicationStepIndex(app.categoryRequested, "psychoanalyticTripod")
  ) {
    return "psychoanalyticTripod";
  }
  if (app.currentStep >= getApplicationStepIndex(app.categoryRequested, "education")) {
    return "education";
  }
  if (app.currentStep >= getApplicationStepIndex(app.categoryRequested, "personal")) {
    return "personal";
  }
  if (app.currentStep >= getApplicationStepIndex(app.categoryRequested, "attendingStudy")) {
    return "attendingStudy";
  }
  return "category";
}

export function CandidaturaWizard() {
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [needsCpf, setNeedsCpf] = useState(false);
  const [cpfInput, setCpfInput] = useState("");
  const [cpfGate, setCpfGate] = useState<CpfGateState>({ type: "idle" });
  const [cpfValidated, setCpfValidated] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [person, setPerson] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const appRes = await fetch("/api/applications");
    const appData = await appRes.json();
    if (
      appData.application &&
      ["draft", "awaiting_complement"].includes(appData.application.status)
    ) {
      applyApplicationToState(appData.application, setApplication, setStep, setPerson);
      setNeedsCpf(false);
    } else {
      setApplication(null);
      setNeedsCpf(true);
      setCpfInput("");
      setCpfGate({ type: "idle" });
      setCpfValidated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetCpfGate() {
    setCpfGate({ type: "idle" });
    setCpfValidated(false);
    setError("");
  }

  async function handleValidateCpf(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    resetCpfGate();

    if (!isValidCpf(cpfInput)) {
      setError("Informe um CPF válido.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/applications/validate-cpf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: normalizeCpf(cpfInput) }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.action === "create") {
      setCpfValidated(true);
      setCpfGate({ type: "ready_create", message: data.message });
      return;
    }

    if (data.action === "resume") {
      setCpfValidated(true);
      setCpfGate({
        type: "ready_resume",
        message: data.message,
        statusLabel: data.statusLabel,
      });
      return;
    }

    if (data.action === "blocked") {
      setCpfGate({
        type: "blocked",
        message: data.message,
        eligibleAt: data.eligibleAt,
      });
      return;
    }

    if (data.action === "track") {
      setCpfGate({
        type: "track",
        message: data.message,
        statusLabel: data.statusLabel,
      });
      return;
    }

    if (data.action === "approved") {
      setCpfGate({ type: "approved", message: data.message });
      return;
    }

    setError(data.error ?? "Não foi possível validar o CPF.");
  }

  async function handleConfirmStart() {
    if (!isValidCpf(cpfInput)) return;
    if (cpfGate.type !== "ready_create" && cpfGate.type !== "ready_resume") return;

    setSaving(true);
    setError("");

    const res = await fetch("/api/applications/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: normalizeCpf(cpfInput) }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.action === "resume" || data.action === "create") {
      const cpfPrefill = formatCpfInput(cpfInput);
      applyApplicationToState(data.application, setApplication, setStep, setPerson, cpfPrefill);
      setNeedsCpf(false);
      return;
    }

    setError(data.error ?? "Não foi possível iniciar a candidatura.");
    resetCpfGate();
  }

  async function saveStep(stepKey: string, data: Record<string, unknown>) {
    if (!application) return false;
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      step: stepKey,
      data,
    };

    if (application.id) {
      payload.applicationId = application.id;
    }

    if (stepKey === "personal" && !application.id) {
      payload.categoryRequested = application.categoryRequested;
      payload.attendingCourseType = application.attendingCourseType;
      payload.attendingInstitution = application.attendingInstitution;
      payload.attendingInstitutionOther = application.attendingInstitutionOther;
    }

    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(result.error ?? "Erro ao salvar");
      return false;
    }

    setApplication(result.application);
    return true;
  }

  async function handleSubmitApplication() {
    if (!application?.id) return;
    setSaving(true);
    const res = await fetch("/api/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: application.id }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Erro ao enviar");
      return;
    }

    setApplication({ ...application, status: "awaiting_review" });
  }

  async function handleUpload(documentType: string, file: File) {
    if (!application?.id) return;
    setSaving(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("applicationId", application.id);
    form.append("documentType", documentType);

    const res = await fetch("/api/documents/upload", { method: "POST", body: form });
    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      const doc = data.document as { id: string; documentType: string; fileName: string };
      setApplication((prev) => {
        if (!prev) return prev;
        const others = prev.documents.filter((d) => d.documentType !== documentType);
        return { ...prev, documents: [...others, doc] };
      });
    } else {
      setError(data.error ?? "Erro no upload");
    }
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  if (loading) {
    return (
      <Section>
        <p className="text-center text-muted">Carregando candidatura...</p>
      </Section>
    );
  }

  if (needsCpf) {
    return (
      <>
        <PageHero
          eyebrow="Candidatura"
          title="Iniciar candidatura"
          subtitle="Primeiro valide seu CPF. Depois você poderá iniciar ou continuar sua candidatura."
        />
        <Section>
          <Card className="max-w-lg border-white/10 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Validação de CPF</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidateCpf} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf-start">CPF</Label>
                  <Input
                    id="cpf-start"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpfInput}
                    onChange={(e) => {
                      setCpfInput(formatCpfInput(e.target.value));
                      if (cpfValidated) resetCpfGate();
                    }}
                    disabled={saving || cpfValidated}
                    required
                  />
                  <p className="text-xs text-muted">
                    Usamos o CPF para identificar candidaturas em andamento e evitar duplicidade.
                  </p>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                {(cpfGate.type === "ready_create" || cpfGate.type === "ready_resume") && (
                  <div className="space-y-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    {"statusLabel" in cpfGate && cpfGate.statusLabel && (
                      <Badge variant="outline">{cpfGate.statusLabel}</Badge>
                    )}
                    <p>{cpfGate.message}</p>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={saving}
                      onClick={handleConfirmStart}
                    >
                      {saving
                        ? "Abrindo..."
                        : cpfGate.type === "ready_resume"
                          ? "Continuar candidatura"
                          : "Iniciar candidatura"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={saving}
                      onClick={resetCpfGate}
                    >
                      Usar outro CPF
                    </Button>
                  </div>
                )}

                {cpfGate.type === "blocked" && (
                  <div className="space-y-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    <p>{cpfGate.message}</p>
                    <Button type="button" variant="ghost" className="w-full" onClick={resetCpfGate}>
                      Tentar outro CPF
                    </Button>
                  </div>
                )}

                {cpfGate.type === "track" && (
                  <div className="space-y-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {"statusLabel" in cpfGate && cpfGate.statusLabel && (
                      <Badge variant="outline">{cpfGate.statusLabel}</Badge>
                    )}
                    <p>{cpfGate.message}</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/acompanhar-candidatura">Acompanhar candidatura</Link>
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={resetCpfGate}>
                      Usar outro CPF
                    </Button>
                  </div>
                )}

                {cpfGate.type === "approved" && (
                  <div className="space-y-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <p>{cpfGate.message}</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/app/login">Acessar área do associado</Link>
                    </Button>
                  </div>
                )}

                {cpfGate.type === "idle" && (
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Validando..." : "Validar CPF"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </Section>
      </>
    );
  }

  if (!application) {
    return (
      <Section>
        <p className="text-center text-red-400">
          Erro ao carregar candidatura. Verifique se o banco de dados está ativo.
        </p>
      </Section>
    );
  }

  if (!["draft", "awaiting_complement"].includes(application.status)) {
    return (
      <Section>
        <Card className="max-w-lg border-white/10 bg-zinc-900/50">
          <CardContent className="p-8 text-center">
            <Badge className="mb-4">Candidatura enviada</Badge>
            <p className="text-muted">
              Sua candidatura foi enviada e será analisada pela equipe responsável.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/acompanhar-candidatura">Acompanhar status</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Voltar ao início</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    );
  }

  const steps = getApplicationStepsForCategory(application.categoryRequested);
  const currentStepDef = steps[step - 1];
  const totalSteps = steps.length;
  const stepsRemaining = totalSteps - step;
  const progressPercent = Math.round((step / totalSteps) * 100);
  const requiredDocs = requiredDocumentsForCategory(application.categoryRequested);
  const optionalDocs = optionalDocumentsForCategory(application.categoryRequested);
  const uploadedDocTypes = application.documents.map((d) => d.documentType);
  const allDocsUploaded = requiredDocs.every((id) => uploadedDocTypes.includes(id));
  const docsUploadedCount = requiredDocs.filter((id) => uploadedDocTypes.includes(id)).length;

  async function goToNextStep(stepKey: string) {
    const currentIndex = steps.findIndex((item) => item.key === stepKey);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      setStep(currentIndex + 2);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Candidatura"
        title="Portal de Candidatura"
        subtitle={currentStepDef?.label ?? ""}
      />

      <Section>
        <div className="w-full">
          <div className="mb-8 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-white">
                Etapa {step} de {totalSteps}
              </span>
              <span className="text-muted">
                {stepsRemaining === 0
                  ? "Última etapa"
                  : `Faltam ${stepsRemaining} ${stepsRemaining === 1 ? "etapa" : "etapas"}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">{progressPercent}% concluído</p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {steps.map((s, index) => (
              <button
                key={s.key}
                type="button"
                onClick={() => index + 1 <= application.currentStep && setStep(index + 1)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  step === index + 1
                    ? "bg-primary text-white"
                    : index + 1 <= application.currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-zinc-800 text-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <Card className="border-white/10 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>{currentStepDef?.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && <p className="text-sm text-red-400">{error}</p>}

              {currentStepDef?.key === "category" && (
                <div className="grid gap-3">
                  {CANDIDATURE_CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={async () => {
                        const ok = await saveStep("category", { category: cat.id });
                        if (ok) {
                          setApplication((prev) =>
                            prev ? { ...prev, categoryRequested: cat.id } : prev
                          );
                          setStep(getApplicationStepIndex(cat.id, "attendingStudy"));
                        }
                      }}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        application.categoryRequested === cat.id
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-primary/30"
                      }`}
                    >
                      <p className="font-bold text-white">{cat.title}</p>
                      <p className="mt-1 text-sm text-muted">{cat.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {currentStepDef?.key === "attendingStudy" && (
                <AttendingStudyForm
                  initial={{
                    attendingCourseType: application.attendingCourseType ?? "",
                    attendingInstitution: application.attendingInstitution ?? "",
                    attendingInstitutionOther: application.attendingInstitutionOther ?? "",
                  }}
                  onSave={async (data) => {
                    const ok = await saveStep("attendingStudy", data);
                    if (ok) await goToNextStep("attendingStudy");
                  }}
                  saving={saving}
                />
              )}

              {currentStepDef?.key === "personal" && (
                <PersonalForm
                  person={person}
                  onSave={async (data) => {
                    const ok = await saveStep("personal", data);
                    if (ok) await goToNextStep("personal");
                  }}
                  saving={saving}
                />
              )}

              {currentStepDef?.key === "education" && (
                <EducationForm
                  initial={application.educationRecords[0]}
                  onSave={async (data) => {
                    const ok = await saveStep("education", data);
                    if (ok) await goToNextStep("education");
                  }}
                  saving={saving}
                />
              )}

              {currentStepDef?.key === "psychoanalyticTripod" && (
                <TripodForm
                  initial={application.curriculumRecord ?? undefined}
                  onSave={async (data) => {
                    const ok = await saveStep("psychoanalyticTripod", data);
                    if (ok) await goToNextStep("psychoanalyticTripod");
                  }}
                  saving={saving}
                />
              )}

              {currentStepDef?.key === "professional" && (
                <ProfessionalForm
                  initialStudyAreas={
                    application.candidate?.studyAreas?.split(", ").filter(Boolean) ?? []
                  }
                  onSave={async (data) => {
                    const ok = await saveStep("professional", data);
                    if (ok) await goToNextStep("professional");
                  }}
                  saving={saving}
                />
              )}

              {currentStepDef?.key === "documents" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted">
                    Envie todos os documentos obrigatórios ({docsUploadedCount} de{" "}
                    {requiredDocs.length} enviados).
                  </p>
                  {DOCUMENT_TYPES.filter((d) => requiredDocs.includes(d.id)).map((doc) => {
                    const uploaded = application.documents.find(
                      (x) => x.documentType === doc.id
                    );
                    return (
                      <DocumentUploadRow
                        key={doc.id}
                        doc={doc}
                        uploaded={uploaded}
                        required
                        saving={saving}
                        onUpload={(file) => handleUpload(doc.id, file)}
                      />
                    );
                  })}

                  {optionalDocs.length > 0 && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <p className="text-sm text-muted">Documentos opcionais</p>
                      {DOCUMENT_TYPES.filter((d) => optionalDocs.includes(d.id)).map((doc) => {
                        const uploaded = application.documents.find(
                          (x) => x.documentType === doc.id
                        );
                        return (
                          <DocumentUploadRow
                            key={doc.id}
                            doc={doc}
                            uploaded={uploaded}
                            saving={saving}
                            onUpload={(file) => handleUpload(doc.id, file)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {currentStepDef?.key === "consents" && (
                <ConsentsForm
                  onSave={async (data) => {
                    const ok = await saveStep("consents", data);
                    if (ok) await handleSubmitApplication();
                  }}
                  saving={saving}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={goBack} disabled={saving}>
                    Voltar
                  </Button>
                ) : (
                  <span />
                )}

                {currentStepDef?.key === "documents" && (
                  <Button
                    type="button"
                    disabled={saving || !allDocsUploaded}
                    onClick={async () => {
                      const ok = await saveStep("documentsComplete", {});
                      if (ok) {
                        setStep(getApplicationStepIndex(application.categoryRequested, "consents"));
                      }
                    }}
                  >
                    {allDocsUploaded ? "Continuar" : "Envie todos os documentos"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}

function DocumentUploadRow({
  doc,
  uploaded,
  required,
  saving,
  onUpload,
}: {
  doc: { id: string; label: string };
  uploaded?: { fileName: string };
  required?: boolean;
  saving: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-white">{doc.label}</p>
          <span
            className={`text-[10px] uppercase tracking-wide ${
              required ? "text-primary" : "text-muted"
            }`}
          >
            {required ? "Obrigatório" : "Opcional"}
          </span>
        </div>
        {uploaded ? (
          <p className="text-xs text-green-400">✓ {uploaded.fileName}</p>
        ) : (
          <p className="text-xs text-muted">Pendente</p>
        )}
      </div>
      <Input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="max-w-full sm:max-w-[220px]"
        disabled={saving}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function AttendingStudyForm({
  initial,
  onSave,
  saving,
}: {
  initial: {
    attendingCourseType: string;
    attendingInstitution: string;
    attendingInstitutionOther: string;
  };
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <SelectField
        label="Tipo de curso que frequenta"
        id="attendingCourseType"
        value={form.attendingCourseType}
        onChange={(v) => setForm({ ...form, attendingCourseType: v })}
        required
      >
        <option value="">Selecione</option>
        {ATTENDING_COURSE_TYPES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Instituição onde estuda"
        id="attendingInstitution"
        value={form.attendingInstitution}
        onChange={(v) =>
          setForm({
            ...form,
            attendingInstitution: v,
            attendingInstitutionOther: v === "other" ? form.attendingInstitutionOther : "",
          })
        }
        required
      >
        <option value="">Selecione</option>
        {ATTENDING_INSTITUTIONS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </SelectField>

      {form.attendingInstitution === "other" && (
        <Field
          label="Indique o nome da instituição de ensino"
          id="attendingInstitutionOther"
          value={form.attendingInstitutionOther}
          onChange={(v) => setForm({ ...form, attendingInstitutionOther: v })}
          required
        />
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar e continuar"}
      </Button>
    </form>
  );
}

function TripodForm({
  initial,
  onSave,
  saving,
}: {
  initial?: {
    analysisHours?: number | null;
    analystName?: string | null;
    supervisionHours?: number | null;
    supervisorName?: string | null;
  };
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    analysisHours: initial?.analysisHours?.toString() ?? "",
    analystName: initial?.analystName ?? "",
    supervisionHours: initial?.supervisionHours?.toString() ?? "",
    supervisorName: initial?.supervisorName ?? "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <Field
        label="Número de horas de análise"
        id="analysisHours"
        type="number"
        value={form.analysisHours}
        onChange={(v) => setForm({ ...form, analysisHours: v })}
        required
      />
      <Field
        label="Nome do analista"
        id="analystName"
        value={form.analystName}
        onChange={(v) => setForm({ ...form, analystName: v })}
        required
      />
      <Field
        label="Número de horas de supervisão"
        id="supervisionHours"
        type="number"
        value={form.supervisionHours}
        onChange={(v) => setForm({ ...form, supervisionHours: v })}
        required
      />
      <Field
        label="Nome do supervisor"
        id="supervisorName"
        value={form.supervisorName}
        onChange={(v) => setForm({ ...form, supervisorName: v })}
        required
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar e continuar"}
      </Button>
    </form>
  );
}

function PersonalForm({
  person,
  onSave,
  saving,
}: {
  person: Record<string, string>;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    fullName: person.fullName ?? "",
    socialName: person.socialName ?? "",
    cpf: person.cpf ?? "",
    rg: person.rg ?? "",
    birthDate: person.birthDate ?? "",
    nationality: person.nationality ?? "Brasil",
    address: person.address ?? "",
    addressNumber: person.addressNumber ?? "",
    city: person.city ?? "",
    state: person.state ?? "PR",
    zipCode: person.zipCode ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    phoneAlt: person.phoneAlt ?? "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  async function fetchAddressByCep(rawCep: string) {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setCepLoading(true);
    setCepError(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        zipCode: cep,
        address: [data.logradouro, data.bairro].filter(Boolean).join(" - "),
        city: data.localidade ?? "",
        state: data.uf ?? prev.state,
      }));
    } catch {
      setCepError("Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <p className="text-sm text-muted sm:col-span-2">
        Campos marcados como <span className="text-primary">obrigatório</span> devem ser preenchidos.
        O rascunho só é salvo após informar e-mail e celular válidos.
      </p>
      <Field label="Nome completo" id="fullName" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} className="sm:col-span-2" required />
      <Field label="País de nacionalidade" id="nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} placeholder="Ex.: Brasil, Portugal, Argentina..." required />
      <Field label="CPF" id="cpf" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} required />
      <Field label="RG" id="rg" value={form.rg} onChange={(v) => setForm({ ...form, rg: v })} />
      <Field label="Data de nascimento" id="birthDate" type="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} required />
      <div className="space-y-2 sm:col-span-2">
        <Field
          label="CEP"
          id="zipCode"
          value={form.zipCode}
          onChange={(v) => {
            const digits = v.replace(/\D/g, "").slice(0, 8);
            setForm({ ...form, zipCode: digits });
            if (digits.length === 8) void fetchAddressByCep(digits);
          }}
          required
        />
        {cepLoading && <p className="text-xs text-muted">Buscando CEP...</p>}
        {cepError && <p className="text-xs text-red-500">{cepError}</p>}
      </div>
      <Field label="Endereço" id="address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="sm:col-span-2" required />
      <Field label="Número" id="addressNumber" value={form.addressNumber} onChange={(v) => setForm({ ...form, addressNumber: v })} required />
      <Field label="Cidade" id="city" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
      <SelectField label="UF" id="state" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required>
        {BRAZILIAN_STATES.map((uf) => (
          <option key={uf} value={uf}>{uf}</option>
        ))}
      </SelectField>
      <Field label="E-mail" id="email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
      <Field label="Celular" id="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
      <Field label="Telefone alternativo" id="phoneAlt" value={form.phoneAlt} onChange={(v) => setForm({ ...form, phoneAlt: v })} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar e continuar"}</Button>
      </div>
    </form>
  );
}

function ProfessionalForm({
  initialStudyAreas,
  onSave,
  saving,
}: {
  initialStudyAreas: string[];
  onSave: (d: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    profession: "",
    occupation: "",
    institution: "",
    practiceCity: "",
    practiceModality: "ambos",
    authorizePublicProfessional: false,
  });
  const [studyAreas, setStudyAreas] = useState(formatStudyAreas(initialStudyAreas));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, studyAreas }); }} className="space-y-4">
      <Field label="Profissão" id="profession" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} />
      <Field label="Instituição" id="institution" value={form.institution} onChange={(v) => setForm({ ...form, institution: v })} />
      <Field label="Cidade de atuação" id="practiceCity" value={form.practiceCity} onChange={(v) => setForm({ ...form, practiceCity: v })} />
      <PracticeAreasPicker value={studyAreas} onChange={setStudyAreas} />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={form.authorizePublicProfessional} onChange={(e) => setForm({ ...form, authorizePublicProfessional: e.target.checked })} />
        Autorizo a publicação destes dados no meu perfil público
      </label>
      <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar e continuar"}</Button>
    </form>
  );
}

function EducationForm({
  initial,
  onSave,
  saving,
}: {
  initial?: ApplicationData["educationRecords"][0];
  onSave: (d: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    institution: initial?.institution ?? "",
    courseName: initial?.courseName ?? "",
    courseType: initial?.courseType ?? "",
    status: initial?.status ?? "em_andamento",
    workload: initial?.workload?.toString() ?? "",
    completionYear: initial?.endDate ? new Date(initial.endDate).getFullYear().toString() : "",
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <Field label="Instituição de ensino" id="institution" value={form.institution} onChange={(v) => setForm({ ...form, institution: v })} required />
      <Field label="Nome do curso" id="courseName" value={form.courseName} onChange={(v) => setForm({ ...form, courseName: v })} required />
      <SelectField label="Tipo de curso" id="courseType" value={form.courseType} onChange={(v) => setForm({ ...form, courseType: v })} required>
        <option value="">Selecione</option>
        {EDUCATION_COURSE_TYPES.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </SelectField>
      <SelectField label="Status" id="status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} required>
        <option value="em_andamento">Em andamento</option>
        <option value="concluido">Concluído</option>
      </SelectField>
      {form.status === "concluido" && (
        <>
          <Field
            label="Ano de conclusão"
            id="completionYear"
            type="number"
            value={form.completionYear}
            onChange={(v) => setForm({ ...form, completionYear: v })}
            required
          />
          <Field
            label="Número de horas do curso concluído"
            id="workload"
            type="number"
            value={form.workload}
            onChange={(v) => setForm({ ...form, workload: v })}
            required
          />
        </>
      )}
      <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar e continuar"}</Button>
    </form>
  );
}

function ConsentsForm({ onSave, saving }: { onSave: (d: Record<string, boolean>) => void; saving: boolean }) {
  const [checks, setChecks] = useState({
    privacyPolicy: false, termsOfUse: false, regulation: false,
    ethicsCode: false, veracity: false, notAutomatic: false, notSubstitute: false,
  });
  const [openDocument, setOpenDocument] = useState<ConsentDocumentId | null>(null);
  const allChecked = Object.values(checks).every(Boolean);

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); if (allChecked) onSave(checks); }} className="space-y-4">
        <p className="text-sm text-muted">
          Leia cada documento antes de aceitar. Clique no link destacado para abrir o conteúdo.
        </p>
        {CANDIDATURE_CONSENT_ITEMS.map(({ key, documentId, label, linkText }) => (
          <div key={key} className="flex items-start gap-2 text-sm text-muted">
            <input
              id={`consent-${key}`}
              type="checkbox"
              checked={checks[key as keyof typeof checks]}
              onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })}
              className="mt-1"
            />
            <div>
              <label htmlFor={`consent-${key}`} className="cursor-pointer">
                {label}
              </label>{" "}
              <button
                type="button"
                onClick={() => setOpenDocument(documentId)}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {linkText}
              </button>
            </div>
          </div>
        ))}
        <Button type="submit" disabled={saving || !allChecked}>
          {saving ? "Enviando..." : "Aceitar termos e enviar candidatura"}
        </Button>
      </form>

      <ConsentDocumentDialog
        documentId={openDocument}
        open={openDocument !== null}
        onOpenChange={(open) => {
          if (!open) setOpenDocument(null);
        }}
      />
    </>
  );
}

function Field({
  label, id, value, onChange, type = "text", className, required, placeholder,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; className?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className={`text-[10px] uppercase tracking-wide ${required ? "text-primary" : "text-muted"}`}>
          {required ? "Obrigatório" : "Opcional"}
        </span>
      </div>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function SelectField({
  label, id, value, onChange, required, children,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  required?: boolean; children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className={`text-[10px] uppercase tracking-wide ${required ? "text-primary" : "text-muted"}`}>
          {required ? "Obrigatório" : "Opcional"}
        </span>
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="flex h-11 w-full rounded-lg border border-border bg-zinc-900 px-4 text-sm text-white"
      >
        {children}
      </select>
    </div>
  );
}
