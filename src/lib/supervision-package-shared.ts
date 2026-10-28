export const SUPERVISION_PACKAGE_TYPE = "supervision_package";

export const SUPERVISION_PACKAGE_MEMBER_AMOUNT = 200;
export const SUPERVISION_PACKAGE_GUEST_AMOUNT = 400;

export const SUPERVISION_PACKAGE = {
  slug: "grupo-supervisoes",
  title: "Grupo de supervisões",
  supervisor: "Willian Figueiredo",
  sessions: 4,
  frequency: "uma por semana",
  maxParticipants: 10,
  description:
    "Grupo de 4 supervisões psicanalíticas (uma por semana) com Willian Figueiredo, voltado à formação e ao aprimoramento da escuta clínica. Cada grupo é limitado a 10 participantes.",
} as const;

export function getSupervisionPackageAmount(isMember: boolean) {
  return isMember
    ? SUPERVISION_PACKAGE_MEMBER_AMOUNT
    : SUPERVISION_PACKAGE_GUEST_AMOUNT;
}
