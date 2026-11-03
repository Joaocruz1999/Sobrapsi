export type ConsentDocumentId =
  | "privacy_policy"
  | "terms_of_use"
  | "regulation"
  | "ethics_code"
  | "veracity"
  | "not_automatic"
  | "not_substitute";

export type ConsentSection = {
  title: string;
  body: string;
};

export type ConsentDocument = {
  id: ConsentDocumentId;
  title: string;
  href: string;
  intro?: string;
  sections: ConsentSection[];
  footer?: string;
};

export const CONSENT_DOCUMENTS: Record<ConsentDocumentId, ConsentDocument> = {
  privacy_policy: {
    id: "privacy_policy",
    title: "Política de Privacidade",
    href: "/privacidade",
    intro:
      "A SOBRAPSI trata dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Tudo é privado por padrão — só torna-se público o que for necessário, aprovado e autorizado pelo titular.",
    sections: [
      {
        title: "Controlador dos dados",
        body: "O controlador dos dados pessoais é a Sociedade Brasileira de Psicanálise (SOBRAPSI), responsável pelas decisões referentes ao tratamento de dados no âmbito de suas atividades institucionais, associativas e formativas.",
      },
      {
        title: "Dados coletados",
        body: "Coletamos dados de identificação, contato, formação, documentos comprobatórios, dados profissionais, financeiros de anuidade e dados de navegação quando necessários à candidatura, associação e uso da plataforma.",
      },
      {
        title: "Dados de candidatura e associados",
        body: "Informações fornecidas no processo de candidatura são utilizadas exclusivamente para análise, cadastro, comunicação institucional e gestão associativa, conforme a categoria solicitada.",
      },
      {
        title: "Documentos enviados",
        body: "Documentos digitalizados permanecem em ambiente restrito, acessível apenas a equipes autorizadas para fins de análise, auditoria e cumprimento de obrigações legais.",
      },
      {
        title: "Finalidade e base legal",
        body: "O tratamento ocorre para execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal, exercício regular de direitos e, quando aplicável, com base no consentimento do titular.",
      },
      {
        title: "Direitos do titular",
        body: "O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação e informações sobre compartilhamentos, nos termos da LGPD.",
      },
    ],
    footer: "Canal do titular: privacidade@sobrapsi.org.br",
  },
  terms_of_use: {
    id: "terms_of_use",
    title: "Termos de Uso",
    href: "/termos",
    intro:
      "Estes termos regulam o uso do site e da plataforma associativa da SOBRAPSI. Ao utilizar os serviços digitais, o usuário declara ciência e concordância com as condições abaixo.",
    sections: [
      {
        title: "Uso do site",
        body: "O site destina-se à divulgação institucional, consulta pública de associados autorizados, candidatura, área logada e serviços correlatos. É vedado o uso para fins ilícitos, fraudulentos ou que comprometam a segurança da plataforma.",
      },
      {
        title: "Candidatura e área logada",
        body: "O candidato e o associado são responsáveis pela veracidade das informações, pela guarda de credenciais de acesso e pelo uso adequado da área restrita, incluindo upload de documentos e atualização cadastral.",
      },
      {
        title: "Veracidade das informações",
        body: "Informações falsas, incompletas ou documentos adulterados podem resultar na suspensão da análise, reprovação da candidatura, cancelamento da associação e demais medidas cabíveis.",
      },
      {
        title: "Uso indevido da carteira de associado",
        body: "A carteira digital e o número de registro associativo não podem ser utilizados para induzir terceiros a erro quanto à formação, habilitação legal ou responsabilidade clínica do portador.",
      },
      {
        title: "Limitações de responsabilidade",
        body: "A SOBRAPSI emprega medidas razoáveis de segurança, mas não garante disponibilidade ininterrupta do site. Conteúdos publicados por terceiros ou links externos são de responsabilidade de seus respectivos autores.",
      },
    ],
  },
  regulation: {
    id: "regulation",
    title: "Regulamento de Associação",
    href: "/regulamento",
    intro:
      "Este regulamento estabelece as normas de candidatura, associação, permanência, renovação e deveres dos integrantes da SOBRAPSI.",
    sections: [
      {
        title: "Categorias de associação",
        body: "A SOBRAPSI contempla as categorias Associado Estudante, Associado Psicanalista, Associado Supervisor, Associado Pesquisador, Associado Institucional e Associado Honorário, cada uma com requisitos e benefícios específicos. Associado Estudante e Associado Psicanalista são as principais vias de candidatura.",
      },
      {
        title: "Requisitos e documentos",
        body: "A candidatura deve ser instruída com os documentos exigidos para a categoria solicitada. Para Associado Estudante: identificação (RG/CPF), comprovante de endereço e comprovante de matrícula ativa. Para Associado Psicanalista: identificação (RG/CPF), comprovante de endereço, certificados e diploma de formação, e comprovação do tripé psicanalítico (análise pessoal, supervisão e prática clínica). As demais categorias seguem os itens definidos no processo vigente. A ausência de qualquer item pode atrasar ou impedir a análise.",
      },
      {
        title: "Processo de análise",
        body: "Após o envio, a candidatura passa por análise documental, curricular e institucional. A equipe responsável pode solicitar complementação de informações ou documentos.",
      },
      {
        title: "Aprovação e reprovação",
        body: "A aprovação não é automática e depende do atendimento aos critérios institucionais. Em caso de reprovação, o candidato será informado pelos canais oficiais, sem obrigação de motivação detalhada quando a lei assim permitir.",
      },
      {
        title: "Renovação, anuidade e deveres",
        body: "A manutenção da associação está condicionada ao pagamento da anuidade, à observância do Código de Ética, à atualização cadastral e ao cumprimento das demais normas associativas.",
      },
    ],
  },
  ethics_code: {
    id: "ethics_code",
    title: "Código de Ética",
    href: "/codigo-de-etica",
    intro:
      "O Código de Ética orienta a conduta dos associados em relação à escuta, ao sigilo, à responsabilidade clínica, aos limites da atuação profissional e à relação com analisandos, pares e sociedade.",
    sections: [
      {
        title: "Princípios fundamentais",
        body: "O psicanalista associado compromete-se com o respeito à dignidade humana, à escuta qualificada, à confidencialidade e à responsabilidade ética de sua prática.",
      },
      {
        title: "Sigilo e confidencialidade",
        body: "Informações obtidas em contexto clínico, formativo ou institucional devem ser protegidas, salvo exceções previstas em lei ou situações de risco grave e iminente, com observância das normas éticas aplicáveis.",
      },
      {
        title: "Responsabilidade clínica",
        body: "A atuação clínica pressupõe formação adequada, análise pessoal, supervisão quando necessária e reconhecimento dos limites de cada profissional e categoria associativa.",
      },
      {
        title: "Publicidade e redes sociais",
        body: "A divulgação profissional deve ser sobria, verídica e compatível com a natureza da psicanálise, evitando promessas de cura, sensacionalismo ou indução a erro quanto às qualificações do associado.",
      },
      {
        title: "Denúncias e sanções",
        body: "Possíveis violações éticas podem ser apuradas pelo Conselho de Ética da SOBRAPSI, com garantia de contraditório e aplicação de sanções associativas previstas em norma.",
      },
    ],
  },
  veracity: {
    id: "veracity",
    title: "Declaração de Veracidade",
    href: "/declaracao-veracidade",
    intro:
      "Ao marcar este aceite, o candidato declara, sob sua responsabilidade, que todas as informações e documentos fornecidos no processo de candidatura são verdadeiros, completos e atualizados.",
    sections: [
      {
        title: "Compromisso com a verdade",
        body: "Declaro que os dados pessoais, profissionais, formativos e documentais informados correspondem à realidade e que não omiti fatos relevantes para a análise da candidatura.",
      },
      {
        title: "Responsabilidade por documentos",
        body: "Declaro que os arquivos enviados são autênticos, legítimos e não foram adulterados, sob pena de responsabilização civil, administrativa e penal, conforme aplicável.",
      },
      {
        title: "Atualização cadastral",
        body: "Comprometo-me a comunicar à SOBRAPSI qualquer alteração relevante em meus dados ou situação profissional após a associação.",
      },
    ],
  },
  not_automatic: {
    id: "not_automatic",
    title: "Sobre a Aprovação da Candidatura",
    href: "/aprovacao-candidatura",
    intro:
      "O envio da candidatura não gera direito automático à associação. A SOBRAPSI realiza análise criteriosa de cada pedido.",
    sections: [
      {
        title: "Análise institucional",
        body: "Cada candidatura é examinada pela equipe responsável, que avalia documentação, formação, adequação à categoria solicitada e demais critérios institucionais vigentes.",
      },
      {
        title: "Prazos e comunicação",
        body: "Os prazos de análise podem variar conforme a complexidade do processo e eventuais solicitações de complementação. O resultado será comunicado pelos canais oficiais da SOBRAPSI.",
      },
      {
        title: "Sem garantia de deferimento",
        body: "O simples preenchimento do formulário ou envio de documentos não implica aprovação automática. A decisão final cabe à diretoria ou órgão competente, conforme o regulamento associativo.",
      },
    ],
  },
  not_substitute: {
    id: "not_substitute",
    title: "Natureza da Associação",
    href: "/natureza-associativa",
    intro:
      "A SOBRAPSI é uma sociedade psicanalítica de natureza associativa, científica, cultural e formativa.",
    sections: [
      {
        title: "O que a associação representa",
        body: "Integrar a SOBRAPSI significa participar de uma comunidade científica e formativa dedicada à psicanálise, com benefícios institucionais definidos para cada categoria.",
      },
      {
        title: "O que a associação não substitui",
        body: "O registro associativo não substitui formação em psicanálise, análise pessoal, supervisão clínica, responsabilidade ética individual nem exigências legais aplicáveis ao exercício profissional.",
      },
      {
        title: "Registro profissional",
        body: "A associação à SOBRAPSI não equivale a registro em conselho profissional, órgão de classe ou autoridade governamental, salvo quando expressamente reconhecido em norma específica.",
      },
    ],
  },
};

export const CANDIDATURE_CONSENT_ITEMS = [
  {
    key: "privacyPolicy",
    documentId: "privacy_policy" as const,
    label: "Li e aceito a",
    linkText: "Política de Privacidade",
  },
  {
    key: "termsOfUse",
    documentId: "terms_of_use" as const,
    label: "Li e aceito os",
    linkText: "Termos de Uso",
  },
  {
    key: "regulation",
    documentId: "regulation" as const,
    label: "Li e aceito o",
    linkText: "Regulamento de Associação",
  },
  {
    key: "ethicsCode",
    documentId: "ethics_code" as const,
    label: "Li e aceito o",
    linkText: "Código de Ética",
  },
  {
    key: "veracity",
    documentId: "veracity" as const,
    label: "Declaro que as informações são verdadeiras —",
    linkText: "ler declaração completa",
  },
  {
    key: "notAutomatic",
    documentId: "not_automatic" as const,
    label: "Tenho ciência de que a aprovação não é automática —",
    linkText: "saiba mais",
  },
  {
    key: "notSubstitute",
    documentId: "not_substitute" as const,
    label: "Tenho ciência de que a associação não substitui formação, análise pessoal ou supervisão —",
    linkText: "saiba mais",
  },
] as const;
