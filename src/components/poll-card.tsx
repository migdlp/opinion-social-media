import Link from "next/link";
import { castVote, loadOwnVote } from "@/app/vote-actions";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PollAuthor } from "@/components/poll-author";
import { PollVoting } from "@/components/poll-voting";
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

// Tarjeta de una encuesta del feed (D-023, V2-033): pregunta, opciones, fecha y autor. Se vota
// desde la propia tarjeta con el mismo componente y la misma acción que el detalle: elegir, confirmar
// y ver los resultados. Sin voto propio no recibe ni muestra datos agregados; las votadas y las
// cerradas (D-020) muestran los resultados desde la carga y las cerradas no admiten voto. La
// pregunta enlaza al detalle; los controles mantienen su propia acción.
export function PollCard({ poll, viewer, saved, now = new Date() }: PollCardProps) {
  const closed = isClosed(poll.closesAt, now);
  const signedIn =
    !viewer || (viewer.kind === "closed" ? viewer.signedIn : viewer.kind !== "anonymous");
  return (
    <article className="poll-card poll-surface relative isolate flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="relative z-20 flex min-h-6 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
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
      <h2 className="text-xl leading-tight font-bold tracking-[-0.03em]">
        <Link href={`/polls/${poll.id}`} className="rounded hover:underline underline-offset-4">
          {poll.question}
        </Link>
      </h2>
      {/* Acciones independientes: no hay un enlace superpuesto a los controles. */}
      <div className="poll-card-voting relative z-10">
        <PollVoting
          poll={poll}
          viewer={viewer ?? { kind: "anonymous" }}
          castVote={castVote}
          loadOwnVote={loadOwnVote}
          closed={closed}
        />
      </div>
      {poll.closesAt && (
        <p className="poll-card-close text-[12px] text-muted">
          <time dateTime={poll.closesAt}>{formatCloseStatus(poll.closesAt, now)}</time>
        </p>
      )}
      <div className="poll-card-footer mt-auto flex flex-wrap items-center justify-between gap-x-2 border-t border-border pt-2 text-[12px] text-muted">
        <PollAuthor author={poll.author} />
        <div className="flex items-center gap-1">
          <SavePoll pollId={poll.id} signedIn={signedIn} initialSaved={saved} />
          <CopyLinkButton path={`/polls/${poll.id}`} title={poll.question} compact />
        </div>
      </div>
    </article>
  );
}
