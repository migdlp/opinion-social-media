import { getNavigationAccount } from "@/lib/auth/navigation";
import { MobileNav } from "./mobile-nav";

export async function MobileNavigation() {
  const account = await getNavigationAccount();
  return <MobileNav signedIn={account.signedIn} />;
}

// Fallback sin hooks de URL: usePathname necesita Suspense en rutas con parámetros
// dinámicos y cacheComponents. No se ofrecen enlaces de sesión antes de conocerla.
export function MobileNavigationFallback() {
  return (
    <div
      role="status"
      aria-label="Cargando navegación"
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-[calc(3.75rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <span className="sr-only">Cargando navegación…</span>
      {[0, 1, 2].map((key) => (
        <span key={key} aria-hidden="true" className="h-8 w-12 rounded-lg bg-track" />
      ))}
    </div>
  );
}
