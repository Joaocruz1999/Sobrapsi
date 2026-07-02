export const metadata = {
  title: "Em breve — SOBRAPSI",
  description: "Estamos preparando novidades. Volte em breve.",
  robots: { index: false, follow: false },
};

export default function ManutencaoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white">
          SB
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          Sociedade Brasileira de Psicanálise
        </p>

        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          Estamos preparando algo novo
        </h1>

        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-300">
          Nosso site está em fase final de configuração. Em breve você poderá
          conhecer a nova plataforma da SOBRAPSI. Agradecemos a sua visita.
        </p>

        <div className="mx-auto mt-10 max-w-sm rounded-xl border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm leading-relaxed text-muted">
            Precisa falar conosco?
          </p>
          <a
            href="mailto:contato@sobrapsi.org.br"
            className="mt-2 inline-block text-sm font-medium text-primary transition-colors hover:text-accent"
          >
            contato@sobrapsi.org.br
          </a>
        </div>

        <p className="mt-10 text-xs text-muted">
          &copy; {new Date().getFullYear()} SOBRAPSI. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
