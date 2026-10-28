"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LockedOptions } from "@/components/locked-options";
import { PollOptionGroup } from "@/components/poll-option";
import { PollResults } from "@/components/poll-results";
import { loginPath, onboardingPath } from "@/lib/auth/redirect";
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
  // Tras una caída de red: estado real del voto propio (null: aún no votó).
  loadOwnVote?: (pollId: string) => Promise<Result<PollResultsData | null>>;
  // Cerrada (V2-013): no se ofrece el selector de voto. Quien ya votó sigue viendo sus resultados.
  closed?: boolean;
  // Opción marcada de antemano al volver del login (V2-033); se ignora si no es de esta encuesta. Nunca
  // emite el voto: hay que confirmar.
  initialSelected?: string | null;
};

// Votar en una encuesta: elegir, confirmar y ver los resultados. Quien no ha votado sólo
// recibe las opciones: los resultados llegan únicamente al votar (o si ya había votado).
// Un visitante, o una sesión caducada, ve la petición de iniciar sesión y vuelve aquí;
// nunca se envía un voto sin confirmación posterior.
export function PollVoting({
  poll,
  viewer,
  castVote,
  loadOwnVote,
  closed,
  initialSelected,
}: PollVotingProps) {
  const [results, setResults] = useState<PollResultsData | null>(
    viewer.kind === "voted" || viewer.kind === "closed" ? viewer.results : null,
  );
  // Sólo se anima la revelación de un voto emitido ahora, no unos resultados ya conocidos.
  const [justVoted, setJustVoted] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    poll.options.some((option) => option.id === initialSelected) ? (initialSelected ?? null) : null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const sending = useRef(false);
  const checkFirst = useRef(false);

  if (results) {
    return (
      <div aria-live="polite">
        <PollResults
          results={results}
          animate={justVoted}
          showMatch={results.myOptionId !== null}
        />
      </div>
    );
  }

  if (closed) {
    return (
      <div className="flex flex-col gap-3">
        <LockedOptions options={poll.options} />
        <p className="text-sm text-muted">Esta encuesta está cerrada y ya no admite votos.</p>
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
    // Tras una caída de red el voto quizá entró: se consulta el servidor antes de reenviarlo.
    if (checkFirst.current && loadOwnVote) {
      const own = await loadOwnVote(poll.id).catch((): Result<PollResultsData | null> => ({
        ok: false,
        error: "NETWORK_ERROR",
      }));
      if (!own.ok) {
        sending.current = false;
        setPending(false);
        setError(own.error);
        return;
      }
      if (own.data) {
        sending.current = false;
        setPending(false);
        setResults(own.data);
        return;
      }
      checkFirst.current = false;
    }
    // Si la llamada ni llega al servidor, la promesa se rechaza.
    const result = await castVote(poll.id, selected).catch((): Result<PollResultsData> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    checkFirst.current = !result.ok && result.error === "NETWORK_ERROR";
    sending.current = false;
    setPending(false);
    if (result.ok) {
      setJustVoted(true);
      setResults(result.data);
    } else if (result.error === "AUTH_REQUIRED") setNeedsLogin(true);
    else if (result.error === "PROFILE_REQUIRED") setNeedsProfile(true);
    else setError(result.error);
  }

  // Vuelve a la encuesta con la opción elegida marcada, pero sin votarla.
  const returnTo = `/polls/${poll.id}${selected ? `?option=${encodeURIComponent(selected)}` : ""}`;

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
        className="min-h-11 action-primary rounded-full px-5 text-sm font-semibold"
      >
        Votar
      </button>
      {needsLogin && (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">
          Inicia sesión para votar; volverás a esta encuesta.{" "}
          <Link href={loginPath(returnTo)} className="font-semibold underline">
            Iniciar sesión
          </Link>
        </p>
      )}
      {needsProfile && (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">
          Elige tu usuario para votar; volverás a esta encuesta.{" "}
          <Link href={onboardingPath(returnTo)} className="font-semibold underline">
            Elegir mi usuario
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
