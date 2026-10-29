import Link from "next/link";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PollAuthor } from "@/components/poll-author";
import { PollVoting } from "@/components/poll-voting";
import { ReportPoll } from "@/components/report-poll";
import { SavePoll } from "@/components/save-poll";
import type { PollDetail, PollResults, Result } from "@/lib/data/types";
import { formatApproximateDate, formatCloseStatus, isClosed } from "@/lib/utils/date";

type PollDetailViewProps = {
  detail: PollDetail;
  castVote: (pollId: string, optionId: string) => Promise<Result<PollResults>>;
  loadOwnVote?: (pollId: string) => Promise<Result<PollResults | null>>;
  // Opción que se marca de antemano al volver del login (V2-033); nunca emite el voto.
  initialSelected?: string | null;
  now?: Date;
};

// Detalle de una encuesta: pregunta como título, formulario de voto (o resultados si ya
// se votó), autor genérico y fecha.
export function PollDetailView({
  detail,
  castVote,
  loadOwnVote,
  initialSelected,
  now = new Date(),
}: PollDetailViewProps) {
  const { poll } = detail;
  const signedIn =
    detail.viewer.kind === "closed" ? detail.viewer.signedIn : detail.viewer.kind !== "anonymous";
  return (
    <article className="poll-surface relative isolate mx-auto flex w-full max-w-content flex-col gap-4 p-4 sm:p-6">
      <div className="relative z-20 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
          {poll.category && (
            <span data-category className="inline-flex items-center gap-1.5 font-medium">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              {poll.category.name}
            </span>
          )}
          <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
        </div>
        <div className="-my-2 -mr-2 shrink-0">
          <ReportPoll pollId={poll.id} signedIn={signedIn} />
        </div>
      </div>
      <h1 className="text-2xl leading-tight font-bold tracking-[-0.03em]">{poll.question}</h1>
      <PollVoting
        poll={poll}
        viewer={detail.viewer}
        castVote={castVote}
        loadOwnVote={loadOwnVote}
        closed={isClosed(poll.closesAt, now)}
        initialSelected={initialSelected}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[13px] text-muted">
        <PollAuthor author={poll.author} />
        {poll.closesAt && (
          <time dateTime={poll.closesAt}>{formatCloseStatus(poll.closesAt, now)}</time>
        )}
        <SavePoll pollId={poll.id} signedIn={signedIn} initialSaved={detail.saved} />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <CopyLinkButton path={`/polls/${poll.id}`} title={poll.question} />
        {/* Siempre presente y sin depender del voto ni de los resultados: cierra el ciclo
            explorar → votar → descubrir → seguir explorando (DESIGN-009). */}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-muted"
        >
          Ver más encuestas
        </Link>
      </div>
    </article>
  );
}
