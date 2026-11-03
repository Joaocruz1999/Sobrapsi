import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHero, Section, SectionHeader } from "@/components/layout/sections";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Seminários, congressos e eventos científicos da SOBRAPSI.",
};

interface EventItem {
  title: string;
  date: string;
  modality: string;
  href: string;
  external?: boolean;
}

const UPCOMING_EVENTS: EventItem[] = [
  {
    title: "Próximo seminário",
    date: "11 de dezembro de 2026",
    modality: "A confirmar",
    href: "/contato",
    external: false,
  },
];

const PAST_EVENTS: EventItem[] = [
  {
    title: "3º Seminário Internacional de Psicanálise",
    date: "18 de setembro de 2026",
    modality: "Online",
    href: "https://sipbrasil.com/sip3.html",
    external: true,
  },
  {
    title: "1º Seminário Internacional de Psicanálise",
    date: "Março de 2026",
    modality: "Online",
    href: "https://sipbrasil.com/eventos/sip1/",
    external: true,
  },
  {
    title: "2º Seminário Internacional de Psicanálise",
    date: "Junho de 2026",
    modality: "Online",
    href: "https://sipbrasil.com",
    external: true,
  },
];

function EventCard({ event, past = false }: { event: EventItem; past?: boolean }) {
  const isExternal = event.external !== false;
  const className = cn(
    "group rounded-xl border bg-zinc-900/50 p-6 transition-colors",
    past
      ? "border-white/5 hover:border-white/20"
      : "border-white/10 hover:border-primary/30"
  );

  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={past ? "outline" : "default"}>{event.modality}</Badge>
        {past ? (
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-muted">
            Realizado
          </span>
        ) : (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
            Em breve
          </span>
        )}
      </div>
      <h3
        className={cn(
          "mb-2 text-xl font-bold text-white",
          !past && "group-hover:text-primary"
        )}
      >
        {event.title}
      </h3>
      <p className="text-sm text-muted">{event.date}</p>
      <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        {past ? "Ver página do evento" : "Saiba mais e inscreva-se"}
        <ExternalLink className="h-3.5 w-3.5" />
      </p>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={event.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={event.href} className={className}>
      {content}
    </Link>
  );
}

export default function EventosPage() {
  return (
    <>
      <PageHero
        eyebrow="Eventos"
        title="Eventos Científicos"
        subtitle="Seminários, congressos, jornadas e lives da SOBRAPSI."
        backgroundText="EVENTOS"
      />

      <Section>
        <SectionHeader title="Próximos eventos" />
        <div className="grid gap-6 md:grid-cols-2">
          {UPCOMING_EVENTS.map((event) => (
            <EventCard key={`${event.title}-${event.date}`} event={event} />
          ))}
        </div>
      </Section>

      <Section variant="card">
        <SectionHeader title="Eventos anteriores" />
        <div className="grid gap-6 md:grid-cols-2">
          {PAST_EVENTS.map((event) => (
            <EventCard key={`${event.title}-${event.date}`} event={event} past />
          ))}
        </div>
      </Section>
    </>
  );
}
