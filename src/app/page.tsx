import Link from "next/link";
import {
  BookOpen,
  Calendar,
  FileText,
  Handshake,
  IdCard,
  Network,
  Scale,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CTABanner,
  FeatureCard,
  InstitutionalNotice,
  Section,
  SectionHeader,
} from "@/components/layout/sections";
import { INSTITUTIONAL_DISCLAIMER, OFFERINGS } from "@/lib/constants";
import { SITE_SHELL } from "@/lib/layout";
import { cn } from "@/lib/utils";

const iconMap = {
  users: Users,
  "id-card": IdCard,
  search: Search,
  calendar: Calendar,
  "book-open": BookOpen,
  network: Network,
  scale: Scale,
  "file-text": FileText,
  handshake: Handshake,
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[70vh] overflow-hidden bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 grayscale"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.95)), url('https://images.unsplash.com/photo-1517048676732-3d975b4516af?w=1920&q=80')",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[18vw] font-black uppercase tracking-tighter text-white/[0.04]"
        >
          SOBRAPSI
        </div>
        <div
          className={cn(
            SITE_SHELL,
            "relative flex min-h-[70vh] flex-col justify-center py-12 lg:py-16"
          )}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Sociedade Brasileira de Psicanálise
          </p>
          <h1 className="max-w-4xl text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Uma sociedade psicanalítica dedicada à formação, ética e supervisão
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            A SOBRAPSI reúne psicanalistas, estudantes e instituições
            comprometidas com uma prática psicanalítica ética, responsável e em
            constante desenvolvimento.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild className="min-w-[12.5rem]">
              <Link href="/candidatura">Quero me associar</Link>
            </Button>
            <Button variant="outline" asChild className="min-w-[12.5rem]">
              <Link href="/consultar-associado">Consultar associado</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Por que existe */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              title="Por que a SOBRAPSI existe?"
              subtitle="A psicanálise se sustenta em uma tradição de estudo, análise pessoal, supervisão, transmissão e responsabilidade ética."
            />
            <p className="text-muted leading-relaxed">
              A SOBRAPSI nasce para reunir profissionais e estudantes que desejam
              construir sua trajetória dentro de uma rede associativa comprometida
              com esses princípios — fortalecendo a transmissão da psicanálise,
              promovendo espaços de estudo e oferecendo apoio institucional à
              trajetória profissional.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {OFFERINGS.slice(0, 4).map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              return (
                <FeatureCard
                  key={item.title}
                  icon={<Icon className="h-6 w-6" />}
                  title={item.title}
                  description=""
                />
              );
            })}
          </div>
        </div>
      </Section>

      {/* O que oferecemos */}
      <Section variant="card">
        <SectionHeader
          title="O que oferecemos"
          subtitle="Uma rede institucional de apoio à prática psicanalítica no Brasil."
          align="center"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERINGS.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            return (
              <FeatureCard
                key={item.title}
                icon={<Icon className="h-6 w-6" />}
                title={item.title}
                description="Recursos e suporte institucional para associados ativos."
              />
            );
          })}
        </div>
      </Section>

      {/* Banner CTA */}
      <Section>
        <CTABanner
          title="Verifique se um associado está ativo na SOBRAPSI"
          description="Consulta pública segura por nome ou número de registro — sem exposição de dados sensíveis."
          buttonText="Consultar agora"
          buttonHref="/consultar-associado"
        />
      </Section>

      {/* Candidatura */}
      <Section variant="card">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
              <div
                className="h-full w-full bg-cover bg-center grayscale contrast-125"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80')",
                }}
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeader title="Candidatura online" />
            <p className="mb-6 text-muted leading-relaxed">
              A candidatura é feita online. O candidato preenche seus dados,
              envia documentos, informa sua trajetória formativa e aguarda análise
              da equipe responsável. A aprovação não é automática.
            </p>
            <Button asChild>
              <Link href="/candidatura">Iniciar candidatura</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Aviso institucional */}
      <Section>
        <InstitutionalNotice>{INSTITUTIONAL_DISCLAIMER}</InstitutionalNotice>
      </Section>

      {/* CTAs finais */}
      <Section variant="card">
        <div className="grid gap-6 md:grid-cols-2">
          <CTABanner
            title="Conheça o Código de Ética"
            description="A ética é eixo central da prática psicanalítica na SOBRAPSI."
            buttonText="Ler Código de Ética"
            buttonHref="/codigo-de-etica"
            variant="outline"
          />
          <CTABanner
            title="Acesse a área do associado"
            description="Carteira digital, renovação e atualização cadastral."
            buttonText="Área do Associado"
            buttonHref="/app"
            variant="outline"
          />
        </div>
      </Section>
    </>
  );
}
