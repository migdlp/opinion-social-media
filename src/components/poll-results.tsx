import type { PollResults as PollResultsData } from "@/lib/data/types";

type PollResultsProps = {
  results: PollResultsData;
};

const percentFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const countFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

const votesLabel = (n: number) => `${countFormat.format(n)} ${n === 1 ? "voto" : "votos"}`;

// Resultados autorizados (sólo llegan tras votar): una barra por opción con recuento
// y porcentaje calculados en el servidor, el total y la opción propia señalada con texto.
// Al montarse, las cifras aparecen y las barras crecen: es la revelación tras votar.
export function PollResults({ results }: PollResultsProps) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {results.options.map((option) => {
          const mine = option.id === results.myOptionId;
          return (
            <li key={option.id} className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between gap-3">
                <span className={`text-[15px] ${mine ? "font-semibold" : ""}`}>
                  {option.text}
                  {mine && (
                    <span className="ml-2 inline-block rounded-full border border-foreground px-2 py-px align-[1px] text-[11px] font-semibold">
                      Tu voto
                    </span>
                  )}
                </span>
                <span className="reveal-figure shrink-0 text-[22px] leading-none font-bold tracking-[-0.03em] tabular-nums">
                  {percentFormat.format(option.percentage)} %
                </span>
              </div>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-track">
                <div
                  data-bar
                  className={`reveal-bar h-full rounded-full ${mine ? "bg-foreground" : "bg-bar-muted"}`}
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
              <span className="text-[13px] text-muted tabular-nums">
                {votesLabel(option.votes)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border pt-3 text-[13px] text-muted tabular-nums">
        {votesLabel(results.totalVotes)} en total
      </p>
    </div>
  );
}
