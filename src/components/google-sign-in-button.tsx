"use client";

import { useState } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

const MESSAGE = "No se ha podido iniciar sesión con Google. Inténtalo de nuevo.";

// Inicia Google OAuth y pide a Supabase volver a /auth/callback con la ruta local de la
// que venía el visitante. El destino se valida aquí y otra vez en el callback.
export function GoogleSignInButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Sin error el navegador está yendo a Google: se deja el botón desactivado.
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        Continuar con Google
      </button>
      {failed && (
        <p role="alert" className="text-sm text-muted">
          {MESSAGE}
        </p>
      )}
    </div>
  );
}
