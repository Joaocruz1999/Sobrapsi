import Link from "next/link";
import { cn } from "@/lib/utils";

interface SiteLogoProps {
  href?: string | null;
  className?: string;
  imageClassName?: string;
}

export function SiteLogo({
  href = "/",
  className,
  imageClassName = "h-12 w-auto",
}: SiteLogoProps) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-sobrapsi.png"
      alt="SOBRAPSI — Sociedade Brasileira de Psicanálise"
      className={cn("w-auto object-contain", imageClassName)}
      decoding="async"
    />
  );

  if (href == null) {
    return <div className={cn("inline-flex shrink-0", className)}>{image}</div>;
  }

  return (
    <Link href={href} className={cn("inline-flex shrink-0", className)}>
      {image}
    </Link>
  );
}
