"use client";

import { useEffect } from "react";

// Aviso del feed tras cerrar la sesión en todos los dispositivos (AUTH-002): «/?sesion=cerrada»
// muestra el mensaje y quita el parámetro de la URL sin recargar, para que un refresco no lo repita.
export function SessionClosedNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("sesion")) return;
    url.searchParams.delete("sesion");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  return (
    <p
      role="status"
      className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium"
    >
      Has cerrado la sesión en todos tus dispositivos.
    </p>
  );
}
