import type { PollResults as PollResultsData } from "@/lib/data/types";

type PollResultsProps = {
  results: PollResultsData;
};

const percentFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const votesLabel = (n: number) => `${n} ${n === 1 ? "voto" : "votos"}`;

// Resultados autorizados (sólo llegan tras votar): una barra por opción con recuento
// y porcentaje calculados en el servidor, el total y la opción propia señalada con texto.
export function PollResults({ results }: PollResultsProps) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {results.options.map((option) => {
          const mine = option.id === results.myOptionId;
          return (
            <li
              key={option.id}
              className={`flex flex-col gap-1 rounded-md border px-3 py-2 ${mine ? "border-accent" : "border-border"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {option.text}
                  {mine && (
                    <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
                      Tu voto
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {percentFormat.format(option.percentage)} %
                </span>
              </div>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  data-bar
                  className="h-full bg-accent"
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted">{votesLabel(option.votes)}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">{votesLabel(results.totalVotes)} en total</p>
    </div>
  );
}
