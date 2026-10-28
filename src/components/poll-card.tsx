import { LockedOptions } from "@/components/locked-options";
import Link from "next/link";
import { PollAuthor } from "@/components/poll-author";
import { PollResults } from "@/components/poll-results";
import { ReportPoll } from "@/components/report-poll";
import { SavePoll } from "@/components/save-poll";
import type { PollViewerState, PublicPoll } from "@/lib/data/types";
import { formatApproximateDate, formatCloseStatus, isClosed } from "@/lib/utils/date";

type PollCardProps = {
  poll: PublicPoll;
  viewer?: PollViewerState;
  // Si la cuenta con sesión la tiene guardada (V2-022); sin dato se muestra como no guardada.
  saved?: boolean;
  now?: Date;
};

// Tarjeta de una encuesta del feed: pregunta, opciones, fecha y autor genérico. Sin voto
// propio no recibe ni muestra datos agregados: cada opción enseña su porcentaje bloqueado
// («?? %») para invitar a votar. Si el usuario ya votó, muestra los resultados. Toda la
// tarjeta lleva al detalle.
export function PollCard({ poll, viewer, saved, now = new Date() }: PollCardProps) {
  // Votó (resultados propios) o la encuesta está cerrada (resultados públicos, D-020).
  const results = viewer?.kind === "voted" || viewer?.kind === "closed" ? viewer.results : null;
  const closed = isClosed(poll.closesAt, now);
  const signedIn =
    !viewer || (viewer.kind === "closed" ? viewer.signedIn : viewer.kind !== "anonymous");
  return (
    <article className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors focus-within:border-foreground hover:border-bar-muted">
      {poll.category && (
        <p
          data-category
          className="self-start rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium text-muted"
        >
          {poll.category.name}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">
          <Link
            href={`/polls/${poll.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl"
          >
            {poll.question}
          </Link>
        </h2>
        <div className="flex items-center">
          <SavePoll pollId={poll.id} signedIn={signedIn} initialSaved={saved} />
          <ReportPoll pollId={poll.id} signedIn={signedIn} />
        </div>
      </div>
      {results ? <PollResults results={results} /> : <LockedOptions options={poll.options} />}
      <p className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>
          <PollAuthor author={poll.author} />
          {" · "}
          <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
          {poll.closesAt && (
            <>
              {" · "}
              <time dateTime={poll.closesAt}>{formatCloseStatus(poll.closesAt, now)}</time>
            </>
          )}
        </span>
        {!results && !closed && <span className="font-medium text-foreground">Vota para ver</span>}
      </p>
    </article>
  );
}
