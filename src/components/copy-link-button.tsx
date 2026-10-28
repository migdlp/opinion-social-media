"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type CopyState = "idle" | "copied" | "manual";

// Copia la URL pública absoluta de una ruta. Si el portapapeles no existe (contexto
// no seguro) o se deniega el permiso, muestra el enlace seleccionado para copiarlo a
// mano, sin errores técnicos. La región status anuncia el resultado. Si el navegador tiene
// hoja nativa (navigator.share), el botón pasa a «Compartir» y comparte título y URL (V2-018);
// cancelar la hoja no es un error y, si falla por otra causa, se copia el enlace.
export function CopyLinkButton({ path, title }: { path: string; title?: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const [url, setUrl] = useState("");
  // En el servidor y en la hidratación vale false; después, lo que soporte el navegador.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === "function",
    () => false,
  );
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "manual") field.current?.focus();
  }, [state]);

  async function handleClick() {
    const href = new URL(path, window.location.origin).href;
    setUrl(href);
    if (canShare) {
      try {
        await navigator.share({ ...(title ? { title } : {}), url: href });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
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
          {canShare ? "Compartir" : "Copiar enlace"}
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
