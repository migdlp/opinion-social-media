import { LockedOptions } from "@/components/locked-options";
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
      <LockedOptions options={poll.options} />
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
