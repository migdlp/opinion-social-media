"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "manual";

// Copia la URL pública absoluta de una ruta. Si el portapapeles no existe (contexto
// no seguro) o se deniega el permiso, muestra el enlace seleccionado para copiarlo a
// mano, sin errores técnicos. La región status anuncia el resultado.
export function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const [url, setUrl] = useState("");
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "manual") field.current?.focus();
  }, [state]);

  async function handleClick() {
    const href = new URL(path, window.location.origin).href;
    setUrl(href);
    try {
      if (!navigator.clipboard) throw new Error("Portapapeles no disponible");
      await navigator.clipboard.writeText(href);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          className="min-h-11 shrink-0 rounded-full border border-field px-4 text-sm font-semibold whitespace-nowrap transition-colors hover:border-foreground"
        >
          Copiar enlace
        </button>
        <p role="status" className="text-[13px] text-muted">
          {state === "copied" && "Enlace copiado"}
          {state === "manual" && "No se ha podido copiar. Selecciona el enlace y cópialo."}
        </p>
      </div>
      {state === "manual" && (
        <input
          ref={field}
          type="text"
          readOnly
          value={url}
          aria-label="Enlace de la encuesta"
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full rounded-lg border border-field bg-surface px-3 text-sm"
        />
      )}
    </div>
  );
}
