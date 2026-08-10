import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createCandidateSession,
  destroyCandidateSession,
  getCandidateSession,
  updatePendingCandidateCategory,
} from "@/lib/candidate-auth";
import {
  buildPendingApplicationShell,
  createGuestApplicationWithPersonal,
  getApplicationById,
  getApplicationForCandidate,
  applicationInclude,
  upsertApplicationCandidate,
  updateApplicationCandidateProfessional,
} from "@/lib/application-guest";
import {
  getApplicationForUser,
  getOrCreateDraftApplication,
  requiredDocumentsForCategory,
} from "@/lib/applications";
import { hasPersistableDraftContact } from "@/lib/application-shared";
import { getApplicationStepIndex } from "@/lib/application-steps";
import { validateCpfForApplicationEdit } from "@/lib/cpf-candidature-eligibility";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/staff-permissions";
import { getUserById } from "@/lib/users";
import { prepareCpfForStorage, prepareRgForStorage, withDecryptedPiiForDisplay } from "@/lib/pii";
import type { MemberCategory } from "@prisma/client";

const STAFF_APPLICATION_ERROR =
  "Contas da equipe administrativa não podem criar candidaturas de associação.";

function bumpCurrentStep(
  application: { currentStep: number; categoryRequested: MemberCategory },
  stepKey:
    | "category"
    | "attendingStudy"
    | "personal"
    | "education"
    | "psychoanalyticTripod"
    | "professional"
    | "documents"
    | "consents"
) {
  return Math.max(
    application.currentStep,
    getApplicationStepIndex(application.categoryRequested, stepKey)
  );
}

async function rejectStaffApplicationAccess(userId: string) {
  const user = await getUserById(userId);
  return Boolean(user && isStaffRole(user.role));
}

async function loadApplicationForRequest() {
  const userSession = await getSession();
  if (userSession) {
    if (await rejectStaffApplicationAccess(userSession.userId)) {
      return { application: null, mode: "staff" as const };
    }

    const application = await getOrCreateDraftApplication(userSession.userId);
    return { application, mode: "user" as const, userId: userSession.userId };
  }

  const candidateSession = await getCandidateSession();
  if (!candidateSession) {
    return { application: null, mode: "none" as const };
  }

  if (candidateSession.applicationId) {
    const application = await getApplicationForCandidate(candidateSession.applicationId);
    if (!application) {
      await destroyCandidateSession();
      return { application: null, mode: "none" as const };
    }
    return { application, mode: "guest" as const };
  }

  if (candidateSession.pendingCpf) {
    const category = (candidateSession.pendingCategory ?? "student") as MemberCategory;
    return {
      application: {
        ...buildPendingApplicationShell(candidateSession.pendingCpf),
        categoryRequested: category,
        currentStep: candidateSession.pendingCategory ? 2 : 1,
      },
      mode: "pending" as const,
      pendingCpf: candidateSession.pendingCpf,
    };
  }

  return { application: null, mode: "none" as const };
}

async function getEditableApplication(
  applicationId: string | undefined,
  userId?: string,
  candidateApplicationId?: string
) {
  if (userId && applicationId) {
    return getApplicationForUser(userId, applicationId);
  }
  if (userId) {
    if (await rejectStaffApplicationAccess(userId)) {
      return null;
    }
    return getOrCreateDraftApplication(userId);
  }
  if (candidateApplicationId && applicationId === candidateApplicationId) {
    return getApplicationById(applicationId);
  }
  if (candidateApplicationId) {
    return getApplicationById(candidateApplicationId);
  }
  return null;
}

export async function GET() {
  try {
    const result = await loadApplicationForRequest();
    if (result.mode === "pending") {
      return NextResponse.json({
        application: result.application,
        pendingDraft: true,
      });
    }
    const application = result.application;
    if (!application) {
      return NextResponse.json({ application: null });
    }
    // `user` só existe quando a candidatura está vinculada a um User logado;
    // nos demais modos o tipo da união não possui essa propriedade.
    const userWithPerson = (
      application as {
        user?: {
          person?: { cpfEncrypted?: string | null; rgEncrypted?: string | null } | null;
        } | null;
      }
    ).user;
    return NextResponse.json({
      application: {
        ...application,
        candidate: withDecryptedPiiForDisplay(application.candidate),
        user: userWithPerson
          ? {
              ...userWithPerson,
              person: withDecryptedPiiForDisplay(userWithPerson.person),
            }
          : userWithPerson,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao carregar candidatura" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userSession = await getSession();
    const candidateSession = await getCandidateSession();

    if (userSession && (await rejectStaffApplicationAccess(userSession.userId))) {
      return NextResponse.json({ error: STAFF_APPLICATION_ERROR }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, step, data } = body;

    const isPendingGuest =
      !userSession &&
      candidateSession?.pendingCpf &&
      (!applicationId || applicationId === "");

    if (isPendingGuest) {
      const pendingCpf = candidateSession.pendingCpf!;

      if (step === "category") {
        const category = (data.category ?? "student") as MemberCategory;
        await updatePendingCandidateCategory(category);
        return NextResponse.json({
          application: {
            ...buildPendingApplicationShell(pendingCpf),
            categoryRequested: category,
            currentStep: getApplicationStepIndex(category, "category"),
          },
          pendingDraft: true,
        });
      }

      if (step === "attendingStudy") {
        const category = (body.categoryRequested ??
          candidateSession.pendingCategory ??
          "student") as MemberCategory;

        if (data.attendingInstitution === "other" && !String(data.attendingInstitutionOther ?? "").trim()) {
          return NextResponse.json(
            { error: "Informe o nome da instituição de ensino." },
            { status: 400 }
          );
        }

        return NextResponse.json({
          application: {
            ...buildPendingApplicationShell(pendingCpf),
            categoryRequested: category,
            attendingCourseType: data.attendingCourseType,
            attendingInstitution: data.attendingInstitution,
            attendingInstitutionOther:
              data.attendingInstitution === "other"
                ? String(data.attendingInstitutionOther ?? "").trim()
                : null,
            currentStep: getApplicationStepIndex(category, "attendingStudy"),
          },
          pendingDraft: true,
        });
      }

      if (step === "personal") {
        if (!hasPersistableDraftContact(data)) {
          return NextResponse.json(
            {
              error:
                "Informe e-mail e celular válidos para salvar o rascunho da candidatura.",
            },
            { status: 400 }
          );
        }

        const cpf = String(data.cpf ?? pendingCpf);
        const cpfCheck = await validateCpfForApplicationEdit(cpf, "");
        if (!cpfCheck.ok) {
          return NextResponse.json({ error: cpfCheck.error }, { status: 400 });
        }

        const category = (body.categoryRequested ??
          data.categoryRequested ??
          candidateSession.pendingCategory ??
          "student") as MemberCategory;

        const application = await createGuestApplicationWithPersonal(
          pendingCpf,
          category,
          { ...data, cpf },
          {
            attendingCourseType: String(
              body.attendingCourseType ?? data.attendingCourseType ?? ""
            ),
            attendingInstitution: String(
              body.attendingInstitution ?? data.attendingInstitution ?? ""
            ),
            attendingInstitutionOther:
              body.attendingInstitutionOther ?? data.attendingInstitutionOther ?? null,
          }
        );

        if (!application) {
          return NextResponse.json(
            { error: "Erro ao criar candidatura" },
            { status: 500 }
          );
        }

        await createCandidateSession(application.id);
        return NextResponse.json({
          application: {
            ...application,
            candidate: withDecryptedPiiForDisplay(application.candidate),
          },
        });
      }

      return NextResponse.json(
        { error: "Salve os dados pessoais antes de continuar." },
        { status: 400 }
      );
    }

    const application = await getEditableApplication(
      applicationId,
      userSession?.userId,
      candidateSession?.applicationId
    );

    if (!application) {
      return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 });
    }

    if (application.userId && userSession?.userId !== application.userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    if (!application.userId && candidateSession?.applicationId !== application.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    if (!["draft", "awaiting_complement"].includes(application.status)) {
      return NextResponse.json(
        { error: "Candidatura não pode ser editada neste status" },
        { status: 400 }
      );
    }

    const isGuest = !application.userId;
    let updated = application;

    switch (step) {
      case "category":
        updated = await prisma.application.update({
          where: { id: application.id },
          data: {
            categoryRequested: data.category,
            currentStep: bumpCurrentStep(application, "category"),
          },
          include: applicationInclude,
        });
        break;

      case "attendingStudy": {
        if (data.attendingInstitution === "other" && !String(data.attendingInstitutionOther ?? "").trim()) {
          return NextResponse.json(
            { error: "Informe o nome da instituição de ensino." },
            { status: 400 }
          );
        }

        updated = await prisma.application.update({
          where: { id: application.id },
          data: {
            attendingCourseType: data.attendingCourseType,
            attendingInstitution: data.attendingInstitution,
            attendingInstitutionOther:
              data.attendingInstitution === "other"
                ? String(data.attendingInstitutionOther ?? "").trim()
                : null,
            currentStep: bumpCurrentStep(application, "attendingStudy"),
          },
          include: applicationInclude,
        });
        break;
      }

      case "personal":
        if (data.cpf) {
          const cpfCheck = await validateCpfForApplicationEdit(
            String(data.cpf),
            application.id
          );
          if (!cpfCheck.ok) {
            return NextResponse.json({ error: cpfCheck.error }, { status: 400 });
          }
        }
        if (isGuest) {
          await upsertApplicationCandidate(application.id, data);
        } else if (userSession) {
          const cpfStored = prepareCpfForStorage(data.cpf ? String(data.cpf) : null);
          const rgStored = prepareRgForStorage(data.rg ? String(data.rg) : null);
          await prisma.person.upsert({
            where: { userId: userSession.userId },
            create: {
              userId: userSession.userId,
              fullName: data.fullName,
              socialName: data.socialName,
              cpfEncrypted: cpfStored.cpfEncrypted,
              cpfHash: cpfStored.cpfHash,
              rgEncrypted: rgStored.rgEncrypted,
              rgIssuer: data.rgIssuer,
              birthDate: data.birthDate ? new Date(data.birthDate) : null,
              nationality: data.nationality,
              address: data.address,
              addressNumber: data.addressNumber,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              email: data.email,
              phone: data.phone,
              phoneAlt: data.phoneAlt,
            },
            update: {
              fullName: data.fullName,
              socialName: data.socialName,
              cpfEncrypted: cpfStored.cpfEncrypted,
              cpfHash: cpfStored.cpfHash,
              rgEncrypted: rgStored.rgEncrypted,
              rgIssuer: data.rgIssuer,
              birthDate: data.birthDate ? new Date(data.birthDate) : null,
              nationality: data.nationality,
              address: data.address,
              addressNumber: data.addressNumber,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              email: data.email,
              phone: data.phone,
              phoneAlt: data.phoneAlt,
            },
          });
        }
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: bumpCurrentStep(application, "personal") },
          include: applicationInclude,
        });
        break;

      case "psychoanalyticTripod": {
        if (application.categoryRequested !== "psychoanalyst") {
          return NextResponse.json({ error: "Etapa não aplicável." }, { status: 400 });
        }

        await prisma.curriculumRecord.upsert({
          where: { applicationId: application.id },
          create: {
            applicationId: application.id,
            analysisHours: Number(data.analysisHours),
            analystName: String(data.analystName),
            supervisionHours: Number(data.supervisionHours),
            supervisorName: String(data.supervisorName),
          },
          update: {
            analysisHours: Number(data.analysisHours),
            analystName: String(data.analystName),
            supervisionHours: Number(data.supervisionHours),
            supervisorName: String(data.supervisorName),
          },
        });
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: bumpCurrentStep(application, "psychoanalyticTripod") },
          include: applicationInclude,
        });
        break;
      }

      case "professional":
        if (isGuest) {
          if (!application.candidate) {
            return NextResponse.json(
              { error: "Complete os dados pessoais primeiro" },
              { status: 400 }
            );
          }
          await updateApplicationCandidateProfessional(application.id, data);
        } else if (userSession) {
          await prisma.person.update({
            where: { userId: userSession.userId },
            data: {
              profession: data.profession,
              occupation: data.occupation,
              institution: data.institution,
              cnpj: data.cnpj,
              professionalWebsite: data.professionalWebsite,
              linkedin: data.linkedin,
              instagram: data.instagram,
              practiceCity: data.practiceCity,
              practiceModality: data.practiceModality,
              studyAreas: data.studyAreas,
              authorizePublicProfessional: data.authorizePublicProfessional ?? false,
            },
          });
        }
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: bumpCurrentStep(application, "professional") },
          include: applicationInclude,
        });
        break;

      case "education": {
        if (data.status === "concluido" && !data.completionYear) {
          return NextResponse.json(
            { error: "Informe o ano de conclusão do curso." },
            { status: 400 }
          );
        }

        const existing = application.educationRecords[0];
        const endDate =
          data.status === "concluido" && data.completionYear
            ? new Date(Number(data.completionYear), 11, 31)
            : null;
        const educationData = {
          institution: data.institution,
          courseName: data.courseName,
          courseType: data.courseType,
          workload: data.workload ? Number(data.workload) : null,
          startDate: data.startDate ? new Date(data.startDate as string) : null,
          endDate,
          status: data.status,
          modality: data.modality,
        };
        if (existing) {
          await prisma.educationRecord.update({
            where: { id: existing.id },
            data: educationData,
          });
        } else {
          await prisma.educationRecord.create({
            data: {
              applicationId: application.id,
              ...educationData,
            },
          });
        }
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: bumpCurrentStep(application, "education") },
          include: applicationInclude,
        });
        break;
      }

      case "curriculum":
        await prisma.curriculumRecord.upsert({
          where: { applicationId: application.id },
          create: {
            applicationId: application.id,
            summary: data.summary,
            clinicalExperience: data.clinicalExperience,
            personalAnalysisStatus: data.personalAnalysisStatus,
            supervisionStatus: data.supervisionStatus,
            studyGroups: data.studyGroups,
            publications: data.publications,
            events: data.events,
            research: data.research,
            notes: data.notes,
          },
          update: {
            summary: data.summary,
            clinicalExperience: data.clinicalExperience,
            personalAnalysisStatus: data.personalAnalysisStatus,
            supervisionStatus: data.supervisionStatus,
            studyGroups: data.studyGroups,
            publications: data.publications,
            events: data.events,
            research: data.research,
            notes: data.notes,
          },
        });
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: Math.max(application.currentStep, 6) },
          include: applicationInclude,
        });
        break;

      case "publicProfile":
        await prisma.applicationPublicProfile.upsert({
          where: { applicationId: application.id },
          create: {
            applicationId: application.id,
            publicName: data.publicName,
            publicCity: data.publicCity,
            publicState: data.publicState,
            publicBio: data.publicBio,
            publicEducationSummary: data.publicEducationSummary,
            publicStudyAreas: data.publicStudyAreas,
            publicWebsite: data.publicWebsite,
            publicLinkedin: data.publicLinkedin,
            publicInstagram: data.publicInstagram,
            authorizeList: data.authorizeList,
            authorizePhoto: data.authorizePhoto,
            authorizeBio: data.authorizeBio,
            authorizeLinks: data.authorizeLinks,
            profilePhotoPath: data.profilePhotoPath,
          },
          update: {
            publicName: data.publicName,
            publicCity: data.publicCity,
            publicState: data.publicState,
            publicBio: data.publicBio,
            publicEducationSummary: data.publicEducationSummary,
            publicStudyAreas: data.publicStudyAreas,
            publicWebsite: data.publicWebsite,
            publicLinkedin: data.publicLinkedin,
            publicInstagram: data.publicInstagram,
            authorizeList: data.authorizeList,
            authorizePhoto: data.authorizePhoto,
            authorizeBio: data.authorizeBio,
            authorizeLinks: data.authorizeLinks,
            profilePhotoPath: data.profilePhotoPath,
          },
        });
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: Math.max(application.currentStep, 8) },
          include: applicationInclude,
        });
        break;

      case "consents": {
        const consentTypes = [
          "privacy_policy",
          "terms_of_use",
          "regulation",
          "ethics_code",
          "veracity_declaration",
        ];
        if (isGuest) {
          for (const type of consentTypes) {
            const existing = await prisma.applicationConsent.findFirst({
              where: { applicationId: application.id, consentType: type },
            });
            if (!existing) {
              await prisma.applicationConsent.create({
                data: {
                  applicationId: application.id,
                  consentType: type,
                  version: "1.0",
                },
              });
            }
          }
        } else if (userSession) {
          for (const type of consentTypes) {
            await prisma.consent.create({
              data: {
                userId: userSession.userId,
                consentType: type,
                version: "1.0",
              },
            });
          }
        }
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: bumpCurrentStep(application, "consents") },
          include: applicationInclude,
        });
        break;
      }

      case "documentsComplete": {
        const required = requiredDocumentsForCategory(application.categoryRequested);
        const uploadedTypes = application.documents.map((d) => d.documentType);
        const missing = required.filter((t) => !uploadedTypes.includes(t));
        if (missing.length > 0) {
          return NextResponse.json(
            { error: `Documentos pendentes: ${missing.join(", ")}` },
            { status: 400 }
          );
        }
        updated = await prisma.application.update({
          where: { id: application.id },
          data: { currentStep: bumpCurrentStep(application, "documents") },
          include: applicationInclude,
        });
        break;
      }
        return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
    }

    return NextResponse.json({
      application: {
        ...updated,
        candidate: withDecryptedPiiForDisplay(updated.candidate),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
