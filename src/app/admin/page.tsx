import type { Metadata } from "next";
import Link from "next/link";
import { AdminPanel } from "@/components/admin/admin-panel";
import { PageHero, SiteContainer } from "@/components/layout/sections";

export const metadata: Metadata = {
  title: "Painel Administrativo",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="Painel Administrativo"
        subtitle="Gestão de associados, candidaturas, blog e equipe."
        fullWidth
      />
      <SiteContainer className="mx-0 max-w-none pb-16 pt-2">
        <AdminPanel />
        <p className="mt-8 text-sm text-muted">
          <Link href="/" className="text-primary hover:underline">
            ← Voltar ao site
          </Link>
        </p>
      </SiteContainer>
    </>
  );
}
