"use client";

import { useEffect } from "react";

// Aviso del feed tras eliminar la cuenta (ACCOUNT-002): «/?cuenta=eliminada» muestra el mensaje y
// quita el parámetro de la URL sin recargar, para que un refresco no lo repita.
export function AccountDeletedNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("cuenta")) return;
    url.searchParams.delete("cuenta");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  return (
    <p
      role="status"
      className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium"
    >
      Tu cuenta se ha eliminado.
    </p>
  );
}
