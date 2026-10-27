"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PollOptionGroup } from "@/components/poll-option";
import { PollResults } from "@/components/poll-results";
import { loginPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type {
  AppErrorCode,
  PollResults as PollResultsData,
  PollViewerState,
  PublicPoll,
  Result,
} from "@/lib/data/types";

type PollVotingProps = {
  poll: PublicPoll;
  viewer: PollViewerState;
  castVote: (pollId: string, optionId: string) => Promise<Result<PollResultsData>>;
};

// Votar en una encuesta: elegir, confirmar y ver los resultados. Quien no ha votado sólo
// recibe las opciones: los resultados llegan únicamente al votar (o si ya había votado).
// Un visitante, o una sesión caducada, ve la petición de iniciar sesión y vuelve aquí;
// nunca se envía un voto sin confirmación posterior.
export function PollVoting({ poll, viewer, castVote }: PollVotingProps) {
  const [results, setResults] = useState<PollResultsData | null>(
    viewer.kind === "voted" ? viewer.results : null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const sending = useRef(false);

  if (results) {
    return (
      <div aria-live="polite">
        <PollResults results={results} />
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || sending.current) return;
    if (viewer.kind === "anonymous") {
      setNeedsLogin(true);
      return;
    }
    sending.current = true;
    setPending(true);
    setError(null);
    // Si la llamada ni llega al servidor, la promesa se rechaza.
    const result = await castVote(poll.id, selected).catch((): Result<PollResultsData> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setPending(false);
    if (result.ok) setResults(result.data);
    else if (result.error === "AUTH_REQUIRED") setNeedsLogin(true);
    else setError(result.error);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <PollOptionGroup
        pollId={poll.id}
        question={poll.question}
        options={poll.options}
        value={selected}
        onValueChange={(id) => {
          setSelected(id);
          setNeedsLogin(false);
        }}
        disabled={pending}
        hideQuestion
      />
      <button
        type="submit"
        disabled={!selected || pending}
        className="min-h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        Votar
      </button>
      {needsLogin && (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">
          Inicia sesión para votar; volverás a esta encuesta.{" "}
          <Link href={loginPath(`/polls/${poll.id}`)} className="font-semibold underline">
            Iniciar sesión
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[error]}
        </p>
      )}
    </form>
  );
}
