"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PollAuthor } from "@/components/poll-author";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, ProfileVote, Result } from "@/lib/data/types";
import { formatApproximateDate } from "@/lib/utils/date";

type ProfileVotesProps = {
  username: string;
  initialVotes: ProfileVote[];
  initialCursor: string | null;
  loadMore: (
    cursor: string,
  ) => Promise<Result<{ votes: ProfileVote[]; nextCursor: string | null }>>;
  now?: Date;
};

// Pestaña «Votadas» (V2-006, V2-007): cada voto con su pregunta y la opción elegida, salvo que
// P-1 la oculte («Votó · vota para ver su elección»). Nunca hay recuentos ni porcentajes.
export function ProfileVotes({
  initialVotes,
  initialCursor,
  loadMore,
  now = new Date(),
}: ProfileVotesProps) {
  const [votes, setVotes] = useState(initialVotes);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const seen = useRef(new Set(initialVotes.map((v) => v.pollId)));

  async function handleMore() {
    if (!cursor || pending) return;
    setPending(true);
    setError(null);
    const page = await loadMore(cursor).catch(
      (): Result<{ votes: ProfileVote[]; nextCursor: string | null }> => ({
        ok: false,
        error: "NETWORK_ERROR",
      }),
    );
    setPending(false);
    if (!page.ok) {
      setError(page.error);
      return;
    }
    const fresh = page.data.votes.filter((v) => !seen.current.has(v.pollId));
    fresh.forEach((v) => seen.current.add(v.pollId));
    setVotes((previous) => [...previous, ...fresh]);
    setCursor(page.data.nextCursor);
  }

  if (votes.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5 text-muted">
        Todavía no hay votos que mostrar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {votes.map((vote) => (
          <li
            key={vote.pollId}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
          >
            <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">
              <Link href={`/polls/${vote.pollId}`} className="hover:underline">
                {vote.question}
              </Link>
            </h2>
            <p className="text-[15px]">
              {vote.choice ? `Votó: ${vote.choice.text}` : "Votó · vota para ver su elección"}
            </p>
            <p className="text-[13px] text-muted">
              <PollAuthor author={vote.author} />
              {" · "}
              <time dateTime={vote.votedAt}>{formatApproximateDate(vote.votedAt, now)}</time>
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-2 py-2">
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {ERROR_MESSAGES[error]}
          </p>
        )}
        {cursor ? (
          <button
            type="button"
            onClick={handleMore}
            disabled={pending}
            aria-busy={pending}
            className="min-h-11 rounded-full border border-field bg-surface px-5 text-sm font-semibold transition-colors hover:border-foreground disabled:cursor-wait disabled:text-muted"
          >
            {pending ? "Cargando…" : "Cargar más"}
          </button>
        ) : (
          <p className="text-sm text-muted">No hay más votos</p>
        )}
      </div>
    </div>
  );
}
