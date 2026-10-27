"use client";

import { useRef, useState } from "react";
import { PollCard } from "@/components/poll-card";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, FeedPage, PublicPoll, Result } from "@/lib/data/types";

type FeedMoreProps = {
  cursor: string | null;
  seenIds: string[];
  loadMore: (cursor: string) => Promise<Result<FeedPage>>;
  now?: Date;
};

// Páginas siguientes del feed, dentro de la misma rejilla que el primer lote (que
// llega del servidor). Descarta encuestas ya vistas, bloquea el control mientras hay
// una petición y lo retira al llegar al final.
export function FeedMore({ cursor: firstCursor, seenIds, loadMore, now }: FeedMoreProps) {
  const [polls, setPolls] = useState<PublicPoll[]>([]);
  const [cursor, setCursor] = useState(firstCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const seen = useRef(new Set(seenIds));

  async function handleClick() {
    if (!cursor || pending) return;
    setPending(true);
    setError(null);
    // Si la petición ni llega al servidor (sin red), la promesa se rechaza.
    const page = await loadMore(cursor).catch((): Result<FeedPage> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    setPending(false);
    if (!page.ok) {
      setError(page.error);
      return;
    }
    const fresh = page.data.items
      .map((item) => item.poll)
      .filter((poll) => !seen.current.has(poll.id));
    fresh.forEach((poll) => seen.current.add(poll.id));
    setPolls((previous) => [...previous, ...fresh]);
    setCursor(page.data.nextCursor);
  }

  return (
    <>
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} now={now} />
      ))}
      <div className="flex flex-col items-center gap-2 py-2 md:col-span-2">
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {ERROR_MESSAGES[error]}
          </p>
        )}
        {cursor ? (
          <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            aria-busy={pending}
            className="min-h-11 rounded-full border border-field bg-surface px-5 text-sm font-semibold transition-colors hover:border-foreground disabled:cursor-wait disabled:text-muted"
          >
            {pending ? "Cargando…" : "Cargar más"}
          </button>
        ) : (
          polls.length > 0 && <p className="text-sm text-muted">No hay más encuestas</p>
        )}
      </div>
    </>
  );
}
