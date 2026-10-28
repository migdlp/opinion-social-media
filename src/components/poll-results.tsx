import type { PollResults as PollResultsData } from "@/lib/data/types";

type PollResultsProps = {
  results: PollResultsData;
  // Sólo justo después de votar: las barras crecen y las cifras aparecen. Con resultados ya
  // conocidos (recarga, feed) se muestran sin animación.
  animate?: boolean;
  // Frase «Coincides con el X %» bajo los resultados (V2-016); sólo en el detalle tras votar.
  showMatch?: boolean;
};

const percentFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const STAGGER_MS = 80;

const countFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

const votesLabel = (n: number) => `${countFormat.format(n)} ${n === 1 ? "voto" : "votos"}`;

// Resultados autorizados (sólo llegan tras votar): una barra por opción con recuento
// y porcentaje calculados en el servidor, el total y la opción propia señalada con texto.
// Con animate, las barras crecen escalonadas por opción; el texto está en el DOM desde el
// principio, así que los lectores de pantalla lo leen sin esperar a la animación.
export function PollResults({ results, animate = false, showMatch = false }: PollResultsProps) {
  const mine = results.options.find((option) => option.id === results.myOptionId);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {results.options.map((option, index) => {
          const isMine = option.id === results.myOptionId;
          return (
            <li key={option.id} className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between gap-3">
                <span className={`text-[15px] ${isMine ? "font-semibold" : ""}`}>
                  {option.text}
                  {isMine && (
                    <span className="ml-2 inline-block rounded-full border border-foreground px-2 py-px align-[1px] text-[11px] font-semibold">
                      Tu voto
                    </span>
                  )}
                </span>
                <span
                  className={`${animate ? "reveal-figure " : ""}shrink-0 text-[22px] leading-none font-bold tracking-[-0.03em] tabular-nums`}
                  style={animate ? { animationDelay: `${index * STAGGER_MS}ms` } : undefined}
                >
                  {percentFormat.format(option.percentage)} %
                </span>
              </div>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-track">
                <div
                  data-bar
                  className={`${animate ? "reveal-bar " : ""}h-full rounded-full ${isMine ? "bg-foreground" : "bg-bar-muted"}`}
                  style={{
                    width: `${option.percentage}%`,
                    ...(animate ? { animationDelay: `${index * STAGGER_MS}ms` } : {}),
                  }}
                />
              </div>
              <span className="text-[13px] text-muted tabular-nums">
                {votesLabel(option.votes)}
              </span>
            </li>
          );
        })}
      </ul>
      {showMatch && mine && (
        <p aria-live="polite" className="text-sm font-medium">
          {results.totalVotes <= 1
            ? "Eres el primero en votar"
            : `Coincides con el ${percentFormat.format(mine.percentage)} % (${mine.votes} ${mine.votes === 1 ? "persona" : "personas"})`}
        </p>
      )}
      <p className="border-t border-border pt-3 text-[13px] text-muted tabular-nums">
        {votesLabel(results.totalVotes)} en total
      </p>
    </div>
  );
}
