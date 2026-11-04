const BLOCK = "rounded-md bg-track motion-safe:animate-pulse";

function CardSkeleton() {
  return (
    <div data-skeleton-card aria-hidden="true" className="poll-surface flex flex-col gap-4 p-4">
      <div className={`h-5 w-4/5 ${BLOCK}`} />
      <div className={`h-9 w-full ${BLOCK}`} />
      <div className={`h-9 w-full ${BLOCK}`} />
      <div className={`h-4 w-1/3 ${BLOCK}`} />
    </div>
  );
}

// Carga del feed: tarjetas vacías con la forma y la rejilla de las reales, para que el
// diseño no salte al llegar los datos. El texto sólo lo oyen lectores de pantalla; el
// pulso se desactiva con prefers-reduced-motion.
export function FeedSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Cargando encuestas…</span>
      <div className="grid items-start gap-4 md:grid-cols-2 md:gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Carga del detalle de una encuesta, con el ancho de lectura del detalle real.
export function PollSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Cargando encuesta…</span>
      <div
        aria-hidden="true"
        className="mx-auto flex w-full max-w-content flex-col gap-4 poll-surface p-4 sm:p-6"
      >
        <div className={`h-8 w-4/5 ${BLOCK}`} />
        <div className={`h-11 w-full ${BLOCK}`} />
        <div className={`h-11 w-full ${BLOCK}`} />
        <div className={`h-11 w-full ${BLOCK}`} />
        <div className={`h-4 w-1/3 ${BLOCK}`} />
      </div>
    </div>
  );
}
