import Link from "next/link";
import { getNavigationAccount } from "@/lib/auth/navigation";
import { AccountMenu } from "./account-menu";

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full border border-field px-3 text-sm sm:px-4 font-semibold whitespace-nowrap transition-colors hover:border-foreground";

// El menú usa sólo @usuario. La sesión y el perfil se comparten con la navegación móvil
// durante esta petición; ninguna lectura privada entra en una caché pública.
export async function AuthButton() {
  const { signedIn, username, avatarIcon } = await getNavigationAccount();

  if (!signedIn) {
    return (
      <Link href="/login" className={BUTTON}>
        Iniciar sesión
      </Link>
    );
  }
  return <AccountMenu username={username} avatarIcon={avatarIcon} />;
}

// Hueco del mismo tamaño mientras se lee la sesión, para que la cabecera no salte.
export function AuthButtonFallback() {
  return <span aria-hidden="true" className="inline-block h-11 w-11 rounded-full bg-track" />;
}
