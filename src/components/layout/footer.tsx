import { Instagram, Mail } from "lucide-react";
import Link from "next/link";
import { INSTITUTIONAL_DISCLAIMER, NAV_ITEMS, SOBRAPSI_CNPJ } from "@/lib/constants";
import { SITE_SHELL } from "@/lib/layout";
import { SiteLogo } from "@/components/layout/site-logo";
import { cn } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className={cn(SITE_SHELL, "py-12 lg:py-14")}>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SiteLogo href="/" imageClassName="mb-4 h-16 w-auto" />
            <p className="text-sm leading-relaxed text-muted">
              Sociedade Brasileira de Psicanálise — dedicação à formação
              continuada, ética e supervisão.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://instagram.com/sobrapsi"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 p-2 text-muted transition-colors hover:border-primary hover:text-primary"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="mailto:contato@sobrapsi.org.br"
                className="rounded-lg border border-white/10 p-2 text-muted transition-colors hover:border-primary hover:text-primary"
                aria-label="E-mail"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Institucional
            </h4>
            <ul className="space-y-2">
              {NAV_ITEMS.slice(0, 5).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacidade" className="text-sm text-muted hover:text-primary">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos" className="text-sm text-muted hover:text-primary">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/regulamento" className="text-sm text-muted hover:text-primary">
                  Regulamento de Associação
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-muted hover:text-primary">
                  Política de Cookies
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Contato
            </h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>contato@sobrapsi.org.br</li>
              <li>
                <Link href="/contato" className="hover:text-primary">
                  Formulário de contato
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-xs leading-relaxed text-muted">
            {INSTITUTIONAL_DISCLAIMER}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} SOBRAPSI. Todos os direitos reservados.</p>
          <p>CNPJ: {SOBRAPSI_CNPJ}</p>
        </div>
      </div>
    </footer>
  );
}
