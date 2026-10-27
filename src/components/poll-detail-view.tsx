import { LockedOptions } from "@/components/locked-options";
import type { PollDetail } from "@/lib/data/types";
import { formatApproximateDate } from "@/lib/utils/date";

type PollDetailViewProps = {
  detail: PollDetail;
  now?: Date;
};

// Detalle público de una encuesta antes de votar: pregunta como título, opciones con
// su porcentaje bloqueado, autor genérico y fecha. Votar llega con MVP-036 y los
// resultados para quien ya votó con MVP-037.
export function PollDetailView({ detail, now = new Date() }: PollDetailViewProps) {
  const { poll } = detail;
  return (
    <article className="mx-auto flex w-full max-w-content flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{poll.question}</h1>
      <LockedOptions options={poll.options} />
      <p className="text-[13px] text-muted">
        <span>Anónimo</span>
        {" · "}
        <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
      </p>
    </article>
  );
}
