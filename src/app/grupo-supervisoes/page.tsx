import { SupervisionPackagePurchase } from "@/components/products/supervision-package-purchase";
import { PageHero, Section } from "@/components/layout/sections";
import {
  SUPERVISION_PACKAGE,
  SUPERVISION_PACKAGE_GUEST_AMOUNT,
  SUPERVISION_PACKAGE_MEMBER_AMOUNT,
} from "@/lib/supervision-package-shared";

export const metadata = {
  title: SUPERVISION_PACKAGE.title,
  description: SUPERVISION_PACKAGE.description,
};

export default function GrupoSupervisoesPage() {
  return (
    <>
      <PageHero
        eyebrow="Formação continuada"
        title={SUPERVISION_PACKAGE.title}
        subtitle={`${SUPERVISION_PACKAGE.sessions} supervisões psicanalíticas com ${SUPERVISION_PACKAGE.supervisor} (${SUPERVISION_PACKAGE.frequency}).`}
        backgroundText="SUPERVISÃO"
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Sobre o grupo</h2>
              <p className="mt-3 text-muted leading-relaxed">
                {SUPERVISION_PACKAGE.description} O acompanhamento é pensado para
                fortalecer a prática clínica, a elaboração do caso e a ética do
                setting analítico.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                Valores
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-200">
                <li className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                  <span>Associados SOBRAPSI</span>
                  <strong className="text-white">
                    R$ {SUPERVISION_PACKAGE_MEMBER_AMOUNT}
                  </strong>
                </li>
                <li className="flex items-start justify-between gap-4">
                  <span>Não associados</span>
                  <strong className="text-white">
                    R$ {SUPERVISION_PACKAGE_GUEST_AMOUNT}
                  </strong>
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted">
                No formulário, informe se você é associado. Validamos o CPF no
                cadastro da SOBRAPSI antes de liberar o checkout.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 p-6">
              <h3 className="font-semibold text-white">O que está incluso</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                <li>
                  {SUPERVISION_PACKAGE.sessions} supervisões psicanalíticas (
                  {SUPERVISION_PACKAGE.frequency})
                </li>
                <li>Supervisão com {SUPERVISION_PACKAGE.supervisor}</li>
                <li>
                  Limite de {SUPERVISION_PACKAGE.maxParticipants} participantes por
                  grupo
                </li>
                <li>Orientação voltada à clínica e à formação continuada</li>
              </ul>
            </div>
          </div>

          <SupervisionPackagePurchase />
        </div>
      </Section>
    </>
  );
}
