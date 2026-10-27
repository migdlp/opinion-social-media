import Link from "next/link";
import type { PublicPoll } from "@/lib/data/types";
import { formatApproximateDate } from "@/lib/utils/date";

type PollCardProps = {
  poll: PublicPoll;
  now?: Date;
};

// Tarjeta pública de una encuesta antes de votar: pregunta, opciones, fecha y autor
// genérico. No recibe ni muestra datos agregados: cada opción enseña su porcentaje
// bloqueado («?? %») para invitar a votar. Toda la tarjeta lleva al detalle.
export function PollCard({ poll, now = new Date() }: PollCardProps) {
  return (
    <article className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors focus-within:border-foreground hover:border-bar-muted">
      <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">
        <Link href={`/polls/${poll.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
          {poll.question}
        </Link>
      </h2>
      <ul className="flex flex-col">
        {poll.options.map((option) => (
          <li
            key={option.id}
            className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0"
          >
            <span className="text-[15px]">{option.text}</span>
            <span className="shrink-0 rounded-md bg-track px-2 py-0.5 text-[13px] font-semibold text-muted tabular-nums">
              <span aria-hidden="true">?? %</span>
              <span className="sr-only">Resultado oculto hasta votar</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>
          <span>Anónimo</span>
          {" · "}
          <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
        </span>
        <span className="font-medium text-foreground">Vota para ver</span>
      </p>
    </article>
  );
}
