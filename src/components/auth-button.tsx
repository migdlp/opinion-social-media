import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full border border-field px-3 text-sm sm:px-4 font-semibold whitespace-nowrap transition-colors hover:border-foreground";

// Estado de sesión en la cabecera: «Iniciar sesión» para visitantes y «Cerrar sesión» para
// quien tiene sesión vigente. Lee las cookies, así que se usa dentro de <Suspense> y no
// bloquea el feed. Una sesión caducada o un fallo de Supabase cuentan como visitante.
export async function AuthButton() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    signedIn = false;
  }

  if (!signedIn) {
    return (
      <Link href="/login" className={BUTTON}>
        Iniciar sesión
      </Link>
    );
  }
  return (
    <form action={signOut}>
      <button type="submit" className={BUTTON}>
        Cerrar sesión
      </button>
    </form>
  );
}

// Hueco del mismo tamaño mientras se lee la sesión, para que la cabecera no salte.
export function AuthButtonFallback() {
  return <span aria-hidden="true" className="inline-block h-11 w-32 rounded-full bg-track" />;
}
