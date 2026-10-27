import Link from "next/link";

// Cabecera común: la marca vuelve al feed y la acción principal lleva a crear.
// El botón de sesión (AuthButton) se añadirá aquí en MVP-026.
export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-content items-center justify-between gap-3 px-4 py-3"
      >
        <Link href="/" className="rounded text-xl font-bold tracking-[-0.03em]">
          Opinión
        </Link>
        <Link
          href="/create"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85"
        >
          Crear encuesta
        </Link>
      </nav>
    </header>
  );
}
