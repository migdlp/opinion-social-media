import { EmptyState } from "@/components/empty-state";
import { PollCard } from "@/components/poll-card";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { FeedPage, Result } from "@/lib/data/types";

type FeedListProps = {
  page: Result<FeedPage>;
  now?: Date;
};

// Lista del feed público: tarjetas en el orden que da el adaptador (más reciente
// primero), un estado vacío útil o un error recuperable sin romper la página.
export function FeedList({ page, now }: FeedListProps) {
  if (!page.ok) {
    return (
      <div role="alert">
        <EmptyState
          title="No se han podido cargar las encuestas"
          description={ERROR_MESSAGES[page.error]}
          action={{ href: "/", label: "Reintentar" }}
        />
      </div>
    );
  }

  if (page.data.items.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay encuestas"
        description="Sé la primera persona en preguntar algo."
        action={{ href: "/create", label: "Crear la primera encuesta" }}
      />
    );
  }

  return (
    <div role="feed" aria-label="Encuestas" className="grid items-start gap-3 md:grid-cols-2">
      {page.data.items.map(({ poll }) => (
        <PollCard key={poll.id} poll={poll} now={now} />
      ))}
    </div>
  );
}
