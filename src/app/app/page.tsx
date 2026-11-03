"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero, Section } from "@/components/layout/sections";
import { COMMUNITY_WHATSAPP_URL, STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface PortalUser {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  member?: {
    id: string;
    registrationNumber: string;
    status: string;
    validUntil?: string;
    needsRenewal?: boolean;
    daysUntilExpiry?: number | null;
  } | null;
  application?: {
    id: string;
    status: string;
    statusLabel: string;
    currentStep: number;
    category: string;
  } | null;
}

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/app/login");
          return;
        }
        setUser(data.user);
        setLoading(false);
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/app/login");
    router.refresh();
  }

  if (loading) {
    return (
      <Section>
        <p className="text-center text-muted">Carregando...</p>
      </Section>
    );
  }

  if (!user) return null;

  const member = user.member;
  const statusLabel = member
    ? STATUS_LABELS[member.status as keyof typeof STATUS_LABELS] ?? member.status
    : "";

  return (
    <>
      <PageHero
        eyebrow="Portal"
        title={`Olá, ${user.fullName ?? user.email}`}
        subtitle={
          member ? "Área do associado SOBRAPSI" : "Área do candidato SOBRAPSI"
        }
      />

      <Section>
        <div className="mb-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </div>

        {member?.needsRenewal && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            {member.status === "expired"
              ? "Sua associação está vencida."
              : `Sua associação vence em ${member.daysUntilExpiry} dias.`}{" "}
            <Link href="/app/renovacao" className="font-semibold underline">
              Renovar agora
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {member ? (
            <Card className="border-white/10 bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Minha associação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-mono text-primary">{member.registrationNumber}</p>
                <Badge variant={member.status === "active" ? "success" : "warning"}>
                  {statusLabel}
                </Badge>
                {member.validUntil && (
                  <p className="text-sm text-muted">
                    Validade: {formatDate(member.validUntil)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" asChild>
                    <Link href="/app/carteira">Carteira digital</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/app/perfil-publico">Perfil público</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/app/renovacao">Renovação</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <a
                      href={COMMUNITY_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Grupo da comunidade
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : user.application ? (
            <Card className="border-white/10 bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Candidatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge>{user.application.statusLabel}</Badge>
                {["draft", "awaiting_complement"].includes(user.application.status) ? (
                  <Button asChild>
                    <Link href="/app/candidatura">Continuar candidatura</Link>
                  </Button>
                ) : (
                  <p className="text-sm text-muted">
                    Sua candidatura está em análise. Você será notificado por e-mail.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-zinc-900/50">
              <CardHeader>
                <CardTitle>Associar-se</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted">
                  Inicie sua candidatura para integrar a SOBRAPSI.
                </p>
                <Button asChild>
                  <Link href="/candidatura">Iniciar candidatura</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-white/10 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Recursos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {member && (
                <>
                  <Link href="/app/carteira" className="block text-sm text-primary hover:underline">
                    Carteira digital
                  </Link>
                  <Link href="/app/perfil-publico" className="block text-sm text-primary hover:underline">
                    Perfil público
                  </Link>
                  <Link href="/app/renovacao" className="block text-sm text-primary hover:underline">
                    Pagamentos e renovação
                  </Link>
                  <a
                    href={COMMUNITY_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary hover:underline"
                  >
                    Grupo da comunidade (WhatsApp)
                  </a>
                </>
              )}
              <Link href="/codigo-de-etica" className="block text-sm text-primary hover:underline">
                Código de Ética
              </Link>
              <Link href="/regulamento" className="block text-sm text-primary hover:underline">
                Regulamento de Associação
              </Link>
              <Link href="/contato" className="block text-sm text-primary hover:underline">
                Suporte
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
