import { PrismaClient, MemberCategory, MemberStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prepareCpfForStorage } from "../src/lib/pii";

const prisma = new PrismaClient();

const DEMO_MEMBER_EMAILS = [
  "maria.silva@example.com",
  "joao.santos@example.com",
  "ana.mendes@example.com",
];

async function main() {
  console.log("Seeding SOBRAPSI database...");

  await prisma.user.deleteMany({
    where: { email: { in: DEMO_MEMBER_EMAILS } },
  });

  const member = {
    email: "vitor@ibrapsi.com.br",
    fullName: "Vitor José Monteiro Pinheiro",
    cpf: "01145292992",
    birthDate: new Date("1983-07-02"),
    registrationNumber: "SBR-000001",
    category: "psychoanalyst" as MemberCategory,
    status: "active" as MemberStatus,
    validUntil: new Date("2027-07-01"),
    publicCity: "Londrina",
    publicState: "PR",
    publicBio:
      "Empresário, professor, escritor e psicanalista. Nascido em Portugal e radicado no Brasil, é fundador e presidente do IBRAPSI e presidente da SOBRAPSI.",
    publicEducationSummary:
      "Formação em Psicanálise Clínica pelo IBRAPSI (2022).",
    publicStudyAreas:
      "Psicanálise com adultos, Supervisão clínica, Formação e ensino de psicanálise",
    publishBio: true,
    qrToken: "vitor-jose-monteiro-pinheiro",
  };

  const defaultPassword = `${String(member.birthDate.getUTCDate()).padStart(2, "0")}/${String(member.birthDate.getUTCMonth() + 1).padStart(2, "0")}/${member.birthDate.getUTCFullYear()}`;
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  const cpfStored = prepareCpfForStorage(member.cpf);

  const user = await prisma.user.upsert({
    where: { email: member.email },
    update: {
      passwordHash,
      role: "member",
      mustChangePassword: true,
      person: {
        update: {
          fullName: member.fullName,
          city: member.publicCity,
          state: member.publicState,
        },
      },
      member: {
        update: {
          registrationNumber: member.registrationNumber,
          category: member.category,
          status: member.status,
          validUntil: member.validUntil,
          publicProfile: {
            update: {
              publicName: member.fullName,
              publicCity: member.publicCity,
              publicState: member.publicState,
              publicBio: member.publicBio,
              publicEducationSummary: member.publicEducationSummary,
              publicStudyAreas: member.publicStudyAreas,
              publishBio: member.publishBio,
              isPublic: true,
              reviewStatus: "approved",
            },
          },
          membershipCard: {
            update: {
              cardNumber: member.registrationNumber,
              validUntil: member.validUntil,
            },
          },
        },
      },
    },
    create: {
      email: member.email,
      passwordHash,
      role: "member",
      mustChangePassword: true,
      person: {
        create: {
          fullName: member.fullName,
          email: member.email,
          cpfEncrypted: cpfStored.cpfEncrypted,
          cpfHash: cpfStored.cpfHash,
          birthDate: member.birthDate,
          city: member.publicCity,
          state: member.publicState,
        },
      },
      member: {
        create: {
          registrationNumber: member.registrationNumber,
          category: member.category,
          status: member.status,
          approvedAt: new Date(),
          validUntil: member.validUntil,
          publicProfile: {
            create: {
              publicName: member.fullName,
              publicCity: member.publicCity,
              publicState: member.publicState,
              publicBio: member.publicBio,
              publicEducationSummary: member.publicEducationSummary,
              publicStudyAreas: member.publicStudyAreas,
              publishBio: member.publishBio,
              isPublic: true,
              reviewStatus: "approved",
            },
          },
          membershipCard: {
            create: {
              cardNumber: member.registrationNumber,
              qrToken: member.qrToken,
              validUntil: member.validUntil,
            },
          },
        },
      },
    },
  });
  console.log(`Created/updated member: ${member.fullName} (${user.email})`);

  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "ADMIN_SEED_PASSWORD não configurado. Defina no .env antes de rodar o seed."
    );
  }
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: "admin@sobrapsi.org.br" },
    update: { passwordHash: adminHash, role: "admin", staffEditor: true },
    create: {
      email: "admin@sobrapsi.org.br",
      passwordHash: adminHash,
      role: "admin",
      staffEditor: true,
      person: {
        create: {
          fullName: "Administrador SOBRAPSI",
          email: "admin@sobrapsi.org.br",
        },
      },
    },
  });
  console.log("Admin staff user: admin@sobrapsi.org.br");

  console.log("Seed completed.");

  const { generateMembershipCardPdf } = await import("../src/lib/membership-card");
  const members = await prisma.member.findMany({ include: { membershipCard: true } });
  for (const m of members) {
    try {
      await generateMembershipCardPdf(m.id);
      console.log(`PDF gerado: ${m.registrationNumber}`);
    } catch (e) {
      console.warn(`PDF não gerado para ${m.registrationNumber}:`, e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
