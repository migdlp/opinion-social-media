import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { safeNextPath } from "@/lib/auth/redirect";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Pantalla de acceso. `next` es la ruta local a la que volver (si es externa o malformada
// se usa «/»); `error=auth` llega desde el callback tras un fallo o una cancelación en
// Google y sólo muestra una explicación: no redirige, así que no hay bucles.
export async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next));
  const failed = first(params.error) === "auth";

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <p className="text-muted">Entra con Google para votar y crear encuestas.</p>
      {failed && (
        <p role="alert" className="rounded-xl border border-border bg-surface p-3 text-sm">
          No se ha podido iniciar sesión: se canceló o falló el acceso con Google. Puedes intentarlo
          de nuevo.
        </p>
      )}
      <GoogleSignInButton next={next} />
    </div>
  );
}
