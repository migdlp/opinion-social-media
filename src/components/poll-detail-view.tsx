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
    <article className="relative isolate mx-auto flex w-full max-w-content flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      {poll.category && (
        <p
          data-category
          className="self-start rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium text-muted"
        >
          {poll.category.name}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{poll.question}</h1>
        <div className="relative z-20 flex shrink-0 items-center">
          <SavePoll pollId={poll.id} signedIn={signedIn} initialSaved={detail.saved} />
          <ReportPoll pollId={poll.id} signedIn={signedIn} />
        </div>
      </div>
      <PollVoting
        poll={poll}
        viewer={detail.viewer}
        castVote={castVote}
        loadOwnVote={loadOwnVote}
        closed={isClosed(poll.closesAt, now)}
        initialSelected={initialSelected}
      />
      <p className="text-[13px] text-muted">
        <PollAuthor author={poll.author} />
        {" · "}
        <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
        {poll.closesAt && (
          <>
            {" · "}
            <time dateTime={poll.closesAt}>{formatCloseStatus(poll.closesAt, now)}</time>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
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
