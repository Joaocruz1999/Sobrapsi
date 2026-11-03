import type { MemberCategory, MemberStatus } from "@/lib/member-types";

export const CATEGORY_LABELS: Record<MemberCategory, string> = {
  student: "Associado Estudante",
  psychoanalyst: "Associado Psicanalista",
  supervisor: "Associado Supervisor",
  researcher: "Associado Pesquisador",
  institutional: "Associado Institucional",
  honorary: "Associado Honorário",
};

export const PUBLIC_MEMBER_SEARCH_CATEGORIES = [
  "psychoanalyst",
  "student",
] as const satisfies readonly MemberCategory[];

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Ativa",
  expiring: "Vencendo",
  expired: "Vencida",
  suspended: "Suspensa",
  cancelled: "Cancelada",
  inactive: "Inativa",
  deceased: "Falecido",
  honorary: "Honorário",
};

export const PSYCHOANALYTIC_PRACTICE_AREAS = [
  "Psicanálise com adultos",
  "Psicanálise com crianças e adolescentes",
  "Terapia de casal",
  "Terapia familiar",
  "Dependência química",
  "Depressão",
  "Ansiedade e transtornos de humor",
  "Transtornos alimentares",
  "Trauma e TEPT",
  "Luto e perdas",
  "Sexualidade e identidade de gênero",
  "Psicossomática",
  "Psicanálise institucional",
  "Supervisão clínica",
  "Pesquisa em psicanálise",
  "Saúde mental perinatal",
  "Envelhecimento e terceira idade",
  "Violência e abuso",
  "Psicanálise de grupos",
  "Formação e ensino de psicanálise",
] as const;

export const EDUCATION_COURSE_TYPES = [
  { id: "curso_livre", label: "Curso livre" },
  { id: "graduacao", label: "Graduação" },
  { id: "pos_graduacao", label: "Pós-graduação" },
] as const;

export const ATTENDING_COURSE_TYPES = [
  { id: "curso_livre_psicanalise", label: "Curso livre em Psicanálise" },
  {
    id: "bacharelado_estudos_teoricos",
    label: "Bacharelado em Estudos Teóricos Psicanalíticos e Sociais",
  },
  {
    id: "pos_graduacao_psicanalise",
    label: "Pós-graduação em alguma área da Psicanálise",
  },
] as const;

export const ATTENDING_INSTITUTIONS = [
  { id: "ibrapsi", label: "IBRAPSI" },
  { id: "other", label: "Outra instituição" },
] as const;

export function labelAttendingCourseType(id: string | null | undefined) {
  return ATTENDING_COURSE_TYPES.find((item) => item.id === id)?.label ?? id ?? null;
}

export function labelAttendingInstitution(
  institution: string | null | undefined,
  otherName?: string | null
) {
  if (!institution) return null;
  if (institution === "other") {
    return otherName?.trim() ? otherName.trim() : "Outra instituição";
  }
  return ATTENDING_INSTITUTIONS.find((item) => item.id === institution)?.label ?? institution;
}

export const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const MAIN_NAV = [
  { href: "/", label: "Home" },
  {
    label: "Institucional",
    items: [
      { href: "/sobre", label: "Sobre a SOBRAPSI" },
      { href: "/codigo-de-etica", label: "Código de Ética" },
      { href: "/associe-se#beneficios", label: "Vantagens de ser um associado" },
      { href: "/associe-se", label: "Associe-se" },
      { href: "/consultar-associado", label: "Consultar Associados" },
    ],
  },
  {
    label: "Membros",
    items: [
      { href: "/app", label: "Área do associado" },
      { href: "/acompanhar-candidatura", label: "Consultar candidatura" },
      { href: "/candidatura", label: "Iniciar pedido de associação" },
    ],
  },
  { href: "/formacao-continuada", label: "Formação" },
  { href: "/blog", label: "Blog" },
  { href: "/eventos", label: "Eventos" },
] as const;

/** @deprecated Usar MAIN_NAV no header; mantido para o footer */
export const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre a SOBRAPSI" },
  { href: "/associe-se", label: "Associe-se" },
  { href: "/consultar-associado", label: "Consultar Associado" },
  { href: "/codigo-de-etica", label: "Código de Ética" },
  { href: "/formacao-continuada", label: "Formação Continuada" },
  { href: "/rede-analise-supervisao", label: "Rede de Análise" },
  { href: "/eventos", label: "Eventos" },
  { href: "/artigos", label: "Artigos" },
  { href: "/contato", label: "Contato" },
] as const;

export const INSTITUTIONAL_DISCLAIMER =
  "A SOBRAPSI é uma sociedade psicanalítica de natureza associativa, científica, cultural e formativa. Seu registro associativo não substitui formação, análise pessoal, supervisão, responsabilidade clínica nem eventuais exigências legais aplicáveis. A associação não equivale a registro em conselho profissional ou órgão estatal.";

export const MEMBERSHIP_CATEGORIES = [
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
  {
    id: "supervisor" as const,
    title: "Associado Supervisor",
    description:
      "Para psicanalistas com experiência clínica e atuação em supervisão.",
  },
  {
    id: "researcher" as const,
    title: "Associado Pesquisador",
    description:
      "Para pesquisadores, professores e autores ligados ao campo da psicanálise.",
  },
  {
    id: "institutional" as const,
    title: "Associado Institucional",
    description:
      "Para instituições de ensino, grupos de estudo, clínicas-escola ou entidades parceiras.",
  },
  {
    id: "honorary" as const,
    title: "Associado Honorário",
    description:
      "Categoria concedida pela diretoria a pessoas de notória contribuição à psicanálise.",
  },
] as const;

export const BENEFITS = [
  "Carteira digital de associado",
  "Consulta pública de registro ativo",
  "Participação em eventos",
  "Acesso a conteúdos exclusivos",
  "Possibilidade de participar de grupos de estudo",
  "Rede de análise e supervisão, conforme categoria",
  "Orientações institucionais",
  "Modelos de documentos",
  "Descontos ou gratuidade em eventos parceiros",
  "Participação em publicações, chamadas e seminários",
] as const;

export const OFFERINGS = [
  {
    title: "Associação institucional",
    icon: "users",
    description:
      "Vínculo formal com uma sociedade psicanalítica associativa, científica e formativa, reconhecida por associados, instituições parceiras e pela comunidade profissional.",
  },
  {
    title: "Carteira de associado",
    icon: "id-card",
    description:
      "Identificação oficial de associado SOBRAPSI, emitida após aprovação da candidatura e disponível na área do associado, com renovação anual.",
  },
  {
    title: "Consulta pública de registro",
    icon: "search",
    description:
      "Verificação pública e segura, por nome ou número de registro, para que pacientes, clínicas e instituições confirmem se um profissional está ativo — sem exposição de dados sensíveis.",
  },
  {
    title: "Eventos científicos",
    icon: "calendar",
    description:
      "Congressos, palestras e encontros com especialistas da psicanálise, reunindo a comunidade associativa para debate e atualização.",
  },
  {
    title: "Formação continuada",
    icon: "book-open",
    description:
      "Cursos e seminários regulares para aprofundamento teórico-clínico, incluindo o acompanhamento do tripé psicanalítico (análise pessoal, supervisão e prática clínica).",
  },
  {
    title: "Rede de análise e supervisão",
    icon: "network",
    description:
      "Suporte a estudantes e associados vinculados a escolas parceiras, com espaço estruturado de supervisão clínica e análise em rede.",
  },
  {
    title: "Orientação ética",
    icon: "scale",
    description:
      "Acompanhamento pelo Conselho de Ética da SOBRAPSI, garantindo que a prática dos associados esteja alinhada aos princípios éticos da psicanálise.",
  },
  {
    title: "Conteúdos e publicações",
    icon: "file-text",
    description:
      "Artigos, textos de referência e produções da comunidade associativa, reunidos no blog institucional e em materiais de estudo.",
  },
  {
    title: "Apoio profissional e institucional",
    icon: "handshake",
    description:
      "Recursos e suporte institucional para associados ativos, fortalecendo a trajetória profissional e o vínculo com a sociedade.",
  },
] as const;

export const ANNUAL_FEE_CARD_AMOUNT = Number(process.env.ANNUAL_FEE_CARD_AMOUNT ?? "600");
export const ANNUAL_FEE_CASH_AMOUNT = Number(process.env.ANNUAL_FEE_CASH_AMOUNT ?? "500");
export const ANNUAL_FEE_INSTALLMENTS = Number(process.env.ANNUAL_FEE_INSTALLMENTS ?? "12");

/** @deprecated use ANNUAL_FEE_CARD_AMOUNT / ANNUAL_FEE_CASH_AMOUNT */
export const ANNUAL_FEE_AMOUNT = ANNUAL_FEE_CARD_AMOUNT;

export const APPLICATION_FEE_CARD_AMOUNT = Number(
  process.env.APPLICATION_FEE_CARD_AMOUNT ?? "600"
);
export const APPLICATION_FEE_CASH_AMOUNT = Number(
  process.env.APPLICATION_FEE_CASH_AMOUNT ?? process.env.APPLICATION_FEE_AMOUNT ?? "500"
);

/** @deprecated use APPLICATION_FEE_CARD_AMOUNT / APPLICATION_FEE_CASH_AMOUNT */
export const APPLICATION_FEE_AMOUNT = APPLICATION_FEE_CARD_AMOUNT;

export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@sobrapsi.org.br";

/** Convite do grupo WhatsApp da comunidade SOBRAPSI (associados). */
export const COMMUNITY_WHATSAPP_URL =
  process.env.COMMUNITY_WHATSAPP_URL ??
  "https://chat.whatsapp.com/E409fnZi4ByAxcy8Tv7JFF";

export const EXPIRY_WARNING_DAYS = 30;

export const SOBRAPSI_CNPJ = process.env.SOBRAPSI_CNPJ ?? "52.279.751/0001-92";
