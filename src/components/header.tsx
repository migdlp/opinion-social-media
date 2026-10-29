import Link from "next/link";
import { Suspense } from "react";
import { AuthButton, AuthButtonFallback } from "./auth-button";

// Cabecera común: la marca vuelve al feed y la acción principal lleva a crear.
// AuthButton refleja la sesión sin bloquear el resto de la página.
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <nav
        aria-label="Principal"
        className="mx-auto flex w-full max-w-wide items-center justify-between gap-3 px-4 py-2"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded text-[23px] font-bold tracking-[-0.03em] whitespace-nowrap"
        >
          Opinión
        </Link>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Suspense fallback={<AuthButtonFallback />}>
            <AuthButton />
          </Suspense>
          <Link
            href="/create"
            className="action-primary hidden min-h-11 items-center rounded-xl sm:inline-flex px-4 text-sm font-semibold"
          >
            <span aria-hidden="true" className="sm:hidden">
              Crear
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              Crear encuesta
            </span>
            <span className="sr-only">Crear encuesta</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
