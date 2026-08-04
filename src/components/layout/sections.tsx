import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_SHELL } from "@/lib/layout";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backgroundText?: string;
  children?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function PageHero({
  title,
  subtitle,
  eyebrow,
  backgroundText,
  children,
  className,
  fullWidth = false,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-black",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black" />
      {backgroundText && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[12vw] font-black uppercase tracking-tighter text-white/[0.03]"
        >
          {backgroundText}
        </div>
      )}
      <div className={fullWidth ? "w-full px-4 sm:px-6 lg:px-8" : SITE_SHELL}>
        <div className="relative pt-10 pb-5 sm:pt-12 sm:pb-6">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-4 flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "card" | "accent";
}

export function Section({
  children,
  className,
  id,
  variant = "default",
}: SectionProps) {
  const variants = {
    default: "bg-black",
    card: "bg-zinc-950",
    accent: "bg-primary",
  };

  return (
    <section id={id} className={cn("py-10 lg:py-14", variants[variant], className)}>
      <div className={SITE_SHELL}>{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  title,
  subtitle,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8",
        align === "center" && "mx-auto max-w-3xl text-center"
      )}
    >
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface CTABannerProps {
  title: string;
  description?: string;
  buttonText: string;
  buttonHref: string;
  variant?: "primary" | "outline";
}

export function CTABanner({
  title,
  description,
  buttonText,
  buttonHref,
  variant = "primary",
}: CTABannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-8 text-center lg:p-10",
        variant === "primary"
          ? "bg-primary text-white"
          : "border border-white/10 bg-zinc-900"
      )}
    >
      <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
      {description && (
        <p
          className={cn(
            "mx-auto mt-3 max-w-2xl",
            variant === "primary" ? "text-white/80" : "text-muted"
          )}
        >
          {description}
        </p>
      )}
      <Button
        className="mt-6"
        variant={variant === "primary" ? "outline" : "default"}
        asChild
      >
        <Link href={buttonHref}>{buttonText}</Link>
      </Button>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 transition-colors hover:border-primary/30">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

interface InstitutionalNoticeProps {
  children: React.ReactNode;
}

export function InstitutionalNotice({ children }: InstitutionalNoticeProps) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <p className="text-sm leading-relaxed text-amber-200/90">{children}</p>
    </div>
  );
}

export function SiteContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(SITE_SHELL, className)}>{children}</div>;
}
