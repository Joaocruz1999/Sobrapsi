import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_WIDTH = 445;
const LOGO_HEIGHT = 275;

interface SiteLogoProps {
  href?: string | null;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function SiteLogo({
  href = "/",
  className,
  imageClassName = "h-12 w-auto",
  priority = false,
}: SiteLogoProps) {
  const image = (
    <Image
      src="/logo-sobrapsi.png"
      alt="SOBRAPSI — Sociedade Brasileira de Psicanálise"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn("w-auto object-contain", imageClassName)}
      priority={priority}
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
