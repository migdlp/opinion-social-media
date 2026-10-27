import Link from "next/link";
import type { PublicPoll } from "@/lib/data/types";
import { formatApproximateDate } from "@/lib/utils/date";

type PollCardProps = {
  poll: PublicPoll;
  now?: Date;
};

// Tarjeta pública de una encuesta antes de votar: pregunta, opciones, fecha y autor
// genérico. No recibe ni muestra datos agregados. Toda la tarjeta lleva al detalle.
export function PollCard({ poll, now = new Date() }: PollCardProps) {
  return (
    <article className="relative flex flex-col gap-3 rounded-lg border border-border p-4 focus-within:border-accent hover:border-accent">
      <h2 className="text-lg font-semibold">
        <Link href={`/polls/${poll.id}`} className="after:absolute after:inset-0 after:rounded-lg">
          {poll.question}
        </Link>
      </h2>
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => (
          <li key={option.id} className="rounded-md border border-border px-3 py-2">
            {option.text}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        <span>Anónimo</span>
        {" · "}
        <time dateTime={poll.createdAt}>{formatApproximateDate(poll.createdAt, now)}</time>
      </p>
    </article>
  );
}
