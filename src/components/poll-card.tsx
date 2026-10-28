import Link from "next/link";
import { castVote, loadOwnVote } from "@/app/vote-actions";
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
// cerradas (D-020) muestran los resultados desde la carga y las cerradas no admiten voto. Toda la
// tarjeta lleva al detalle salvo los controles, que van por encima del enlace.
export function PollCard({ poll, viewer, saved, now = new Date() }: PollCardProps) {
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
      {/* Por encima del enlace que cubre la tarjeta: los controles de voto no van dentro de un enlace. */}
      <div className="relative z-10">
        <PollVoting
          poll={poll}
          viewer={viewer ?? { kind: "anonymous" }}
          castVote={castVote}
          loadOwnVote={loadOwnVote}
          closed={closed}
        />
      </div>
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
      </p>
    </article>
  );
}
