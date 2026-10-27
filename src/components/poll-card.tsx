import { LockedOptions } from "@/components/locked-options";
import Link from "next/link";
import { PollResults } from "@/components/poll-results";
import type { PollViewerState, PublicPoll } from "@/lib/data/types";
import { formatApproximateDate } from "@/lib/utils/date";

type PollCardProps = {
  poll: PublicPoll;
  viewer?: PollViewerState;
  now?: Date;
};

// Tarjeta de una encuesta del feed: pregunta, opciones, fecha y autor genérico. Sin voto
// propio no recibe ni muestra datos agregados: cada opción enseña su porcentaje bloqueado
// («?? %») para invitar a votar. Si el usuario ya votó, muestra los resultados. Toda la
// tarjeta lleva al detalle.
export function PollCard({ poll, viewer, now = new Date() }: PollCardProps) {
  const results = viewer?.kind === "voted" ? viewer.results : null;
  return (
    <article className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors focus-within:border-foreground hover:border-bar-muted">
      <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">
        <Link href={`/polls/${poll.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
          {poll.question}
        </Link>
      </h2>
      {results ? <PollResults results={results} /> : <LockedOptions options={poll.options} />}
      <p className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>
          <span>Anónimo</span>
          {" · "}
          <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
        </span>
        {!results && <span className="font-medium text-foreground">Vota para ver</span>}
      </p>
    </article>
  );
}
