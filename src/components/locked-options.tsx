import type { PollOption } from "@/lib/data/types";

// Opciones antes de votar: cada una con su porcentaje bloqueado («?? %»). Compartido
// por la tarjeta del feed y el detalle; nunca recibe ni muestra cifras reales.
export function LockedOptions({ options }: { options: PollOption[] }) {
  return (
    <ul className="flex flex-col">
      {options.map((option) => (
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
  );
}
