"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PollCard } from "@/components/poll-card";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, FeedItem, FeedPage, Result } from "@/lib/data/types";

type FeedMoreProps = {
  cursor: string | null;
  seenIds: string[];
  loadMore: (cursor: string) => Promise<Result<FeedPage>>;
  now?: Date;
};

// Páginas siguientes del feed (V2-034, D-023), dentro de la misma rejilla que el primer lote (que
// llega del servidor). Se cargan solas al acercarse al final (IntersectionObserver) y el botón
// «Cargar más» está siempre disponible: es la única vía si el navegador no tiene el observador.
// - Una sola petición en vuelo; las tarjetas ya vistas se descartan.
// - Un error conserva las filas, se explica y NO se reintenta solo (el botón pasa a «Reintentar»):
//   así un fallo persistente nunca provoca un bucle de peticiones.
// - Si el servidor devolviera el mismo cursor sin novedades se da la lista por terminada.
// - La carga se anuncia en una región `status` y jamás se mueve el foco.
// Al cambiar de pestaña o categoría la página remonta este componente (otra `key`): sus filas y su
// cursor se descartan y una respuesta tardía de la selección anterior no llega a ninguna parte.
export function FeedMore({ cursor: firstCursor, seenIds, loadMore, now }: FeedMoreProps) {
  const [polls, setPolls] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState(firstCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Ya se pidió alguna página: permite decir «no hay más» aunque la última no trajera novedades.
  const [loadedOnce, setLoadedOnce] = useState(false);
  const seen = useRef(new Set(seenIds));
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadNext = useCallback(async () => {
    if (!cursor || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setAnnouncement("Cargando más encuestas…");
    // Si la petición ni llega al servidor (sin red), la promesa se rechaza.
    const page = await loadMore(cursor).catch((): Result<FeedPage> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    inFlight.current = false;
    if (!mounted.current) return;
    setPending(false);
    setLoadedOnce(true);
    if (!page.ok) {
      setError(page.error);
      setAnnouncement("");
      return;
    }
    const fresh = page.data.items.filter(({ poll }) => !seen.current.has(poll.id));
    fresh.forEach(({ poll }) => seen.current.add(poll.id));
    setPolls((previous) => [...previous, ...fresh]);
    const next = page.data.nextCursor;
    setCursor(next === cursor && fresh.length === 0 ? null : next);
    setAnnouncement(
      fresh.length > 0
        ? `Se han cargado ${fresh.length} ${fresh.length === 1 ? "encuesta más" : "encuestas más"}.`
        : "",
    );
  }, [cursor, loadMore]);

  // El observador se vuelve a armar tras cada página: si el final sigue a la vista, la callback
  // inicial dispara la siguiente carga. Con un error activo no se observa (no hay bucle).
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !cursor || error || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNext();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [cursor, error, polls.length, loadNext]);

  return (
    <>
      {polls.map(({ poll, viewer, saved }) => (
        <PollCard key={poll.id} poll={poll} viewer={viewer} saved={saved} now={now} />
      ))}
      <div className="flex flex-col items-center gap-2 py-2 md:col-span-2">
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {ERROR_MESSAGES[error]}
          </p>
        )}
        {cursor ? (
          <button
            type="button"
            onClick={() => void loadNext()}
            disabled={pending}
            aria-busy={pending}
            className="min-h-11 rounded-full border border-field bg-surface px-5 text-sm font-semibold transition-colors hover:border-foreground disabled:cursor-wait disabled:text-muted"
          >
            {pending ? "Cargando…" : "Cargar más"}
          </button>
        ) : (
          (polls.length > 0 || loadedOnce) && (
            <p className="text-sm text-muted">No hay más encuestas</p>
          )
        )}
        {/* Final de la lista: al acercarse se pide la página siguiente. */}
        <div ref={sentinel} aria-hidden="true" className="h-px w-full" />
      </div>
    </>
  );
}
