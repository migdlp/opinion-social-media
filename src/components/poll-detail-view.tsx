import { CopyLinkButton } from "@/components/copy-link-button";
import { PollVoting } from "@/components/poll-voting";
import type { PollDetail, PollResults, Result } from "@/lib/data/types";
import { formatApproximateDate, formatCloseStatus, isClosed } from "@/lib/utils/date";

type PollDetailViewProps = {
  detail: PollDetail;
  castVote: (pollId: string, optionId: string) => Promise<Result<PollResults>>;
  loadOwnVote?: (pollId: string) => Promise<Result<PollResults | null>>;
  now?: Date;
};

// Detalle de una encuesta: pregunta como título, formulario de voto (o resultados si ya
// se votó), autor genérico y fecha.
export function PollDetailView({
  detail,
  castVote,
  loadOwnVote,
  now = new Date(),
}: PollDetailViewProps) {
  const { poll } = detail;
  return (
    <article className="mx-auto flex w-full max-w-content flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{poll.question}</h1>
      <PollVoting
        poll={poll}
        viewer={detail.viewer}
        castVote={castVote}
        loadOwnVote={loadOwnVote}
        closed={isClosed(poll.closesAt, now)}
      />
      <p className="text-[13px] text-muted">
        <span>Anónimo</span>
        {" · "}
        <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
        {poll.closesAt && (
          <>
            {" · "}
            <time dateTime={poll.closesAt}>{formatCloseStatus(poll.closesAt, now)}</time>
          </>
        )}
      </p>
      <CopyLinkButton path={`/polls/${poll.id}`} />
    </article>
  );
}
