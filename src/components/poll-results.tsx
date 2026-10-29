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

const countFormat = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

const votesLabel = (n: number) => `${countFormat.format(n)} ${n === 1 ? "voto" : "votos"}`;

// Resultados autorizados (sólo llegan tras votar): una barra por opción con recuento
// y porcentaje calculados en el servidor, el total y la opción propia señalada con texto.
// Con animate, las barras crecen juntas sin retraso; el texto está en el DOM desde el
// principio, así que los lectores de pantalla lo leen sin esperar a la animación.
export function PollResults({ results, animate = false, showMatch = false }: PollResultsProps) {
  const mine = results.options.find((option) => option.id === results.myOptionId);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {results.options.map((option) => {
          const isMine = option.id === results.myOptionId;
          return (
            <li key={option.id} data-own={isMine} className="result-option flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <span className="text-[15px] font-medium">
                  {option.text}
                  {isMine && (
                    <span className="ml-2 inline-block rounded-full bg-accent px-2 py-px text-accent-foreground align-[1px] text-[11px] font-semibold">
                      Tu voto
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xl leading-none font-semibold tracking-[-0.02em] tabular-nums">
                  {percentFormat.format(option.percentage)} %
                </span>
              </div>
              <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-track">
                <div
                  data-bar
                  className={`${animate ? "reveal-bar " : ""}result-fill h-full rounded-full ${isMine ? "bg-bar-own" : "bg-bar-muted"}`}
                  style={{
                    width: `${option.percentage}%`,
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
        <p aria-live="polite" className="text-[13px] text-muted">
          {results.totalVotes <= 1
            ? "Eres el primero en votar"
            : `Coincides con el ${percentFormat.format(mine.percentage)} % (${mine.votes} ${mine.votes === 1 ? "persona" : "personas"})`}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-muted">
        <span className="tabular-nums">{votesLabel(results.totalVotes)} en total</span>
        <span className="inline-flex items-center gap-1 font-medium">
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
          {results.myOptionId ? "Ya has votado" : "Encuesta cerrada"}
        </span>
      </div>
    </div>
  );
}
