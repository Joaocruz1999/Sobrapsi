import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(3, "Nome completo obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Aceite a política de privacidade" }),
  }),
});

export const loginSchema = z.object({
  cpf: z.string().min(11, "CPF inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const categorySchema = z.object({
  category: z.enum(["student", "psychoanalyst"]),
});

export const cpfStartSchema = z.object({
  cpf: z.string().min(11, "CPF inválido"),
});

export const personalDataSchema = z.object({
  fullName: z.string().min(3),
  socialName: z.string().optional(),
  cpf: z.string().min(11, "CPF inválido"),
  rg: z.string().optional(),
  rgIssuer: z.string().optional(),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  nationality: z.string().default("Brasileira"),
  address: z.string().min(3),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().min(8),
  email: z.string().email(),
  phone: z.string().min(10),
  phoneAlt: z.string().optional(),
});

export const professionalDataSchema = z.object({
  profession: z.string().optional(),
  occupation: z.string().optional(),
  institution: z.string().optional(),
  cnpj: z.string().optional(),
  professionalWebsite: z.string().optional(),
  linkedin: z.string().optional(),
  instagram: z.string().optional(),
  practiceCity: z.string().optional(),
  practiceModality: z.enum(["presencial", "online", "ambos"]).optional(),
  studyAreas: z.string().optional(),
  authorizePublicProfessional: z.boolean().default(false),
});

export const attendingStudySchema = z.object({
  attendingCourseType: z.enum([
    "curso_livre_psicanalise",
    "bacharelado_estudos_teoricos",
    "pos_graduacao_psicanalise",
  ]),
  attendingInstitution: z.enum(["ibrapsi", "other"]),
  attendingInstitutionOther: z.string().optional(),
});

export const psychoanalyticTripodSchema = z.object({
  analysisHours: z.coerce.number().int().min(0),
  analystName: z.string().min(2),
  supervisionHours: z.coerce.number().int().min(0),
  supervisorName: z.string().min(2),
});

export const educationSchema = z.object({
  institution: z.string().min(2),
  courseName: z.string().min(2),
  courseType: z.string().optional(),
  workload: z.coerce.number().int().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["em_andamento", "concluido"]).optional(),
  modality: z.string().optional(),
  completionYear: z.coerce.number().optional(),
});

export const curriculumSchema = z.object({
  summary: z.string().optional(),
  clinicalExperience: z.string().optional(),
  personalAnalysisStatus: z.enum(["sim", "nao", "em_andamento"]).optional(),
  supervisionStatus: z.enum(["sim", "nao", "em_andamento"]).optional(),
  studyGroups: z.string().optional(),
  publications: z.string().optional(),
  events: z.string().optional(),
  research: z.string().optional(),
  notes: z.string().optional(),
});

export const publicProfileSchema = z.object({
  publicName: z.string().min(3),
  publicCity: z.string().optional(),
  publicState: z.union([z.string().length(2), z.literal("")]).optional(),
  publicBio: z.string().max(600).optional(),
  publicEducationSummary: z.string().optional(),
  publicStudyAreas: z.string().optional(),
  publicWebsite: z.string().optional(),
  publicLinkedin: z.string().optional(),
  publicInstagram: z.string().optional(),
  publicPhotoUrl: z.string().optional(),
  authorizeList: z.boolean(),
  authorizePhoto: z.boolean(),
  authorizeBio: z.boolean(),
  authorizeLinks: z.boolean(),
});

export const consentsSchema = z.object({
  privacyPolicy: z.literal(true),
  termsOfUse: z.literal(true),
  regulation: z.literal(true),
  ethicsCode: z.literal(true),
  veracity: z.literal(true),
  notAutomatic: z.literal(true),
  notSubstitute: z.literal(true),
});

export const APPLICATION_STEPS = [
  { id: 1, key: "category", label: "Categoria" },
  { id: 2, key: "attendingStudy", label: "Estudos atuais" },
  { id: 3, key: "personal", label: "Dados pessoais" },
  { id: 4, key: "education", label: "Formação" },
  { id: 5, key: "psychoanalyticTripod", label: "Tripé psicanalítico" },
  { id: 6, key: "professional", label: "Dados profissionais" },
  { id: 7, key: "documents", label: "Documentos" },
  { id: 8, key: "consents", label: "Termos e contratos" },
] as const;
