import { EmptyState } from "@/components/empty-state";
import { FeedMore } from "@/components/feed-more";
import { PollCard } from "@/components/poll-card";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { FeedPage, Result } from "@/lib/data/types";

type FeedListProps = {
  page: Result<FeedPage>;
  loadMore: (cursor: string) => Promise<Result<FeedPage>>;
  now?: Date;
  // Estado vacío propio (p. ej. el perfil de alguien sin encuestas); por defecto, el del feed.
  empty?: { title: string; description: string; action?: { href: string; label: string } };
  // Destino de «Reintentar» (por defecto «/»): permite conservar la pestaña y la categoría.
  retryHref?: string;
};

// Lista del feed público: tarjetas en el orden que da el adaptador (más reciente
// primero), un estado vacío útil o un error recuperable sin romper la página.
export function FeedList({ page, loadMore, now, empty, retryHref = "/" }: FeedListProps) {
  if (!page.ok) {
    return (
      <div role="alert">
        <EmptyState
          title="No se han podido cargar las encuestas"
          description={ERROR_MESSAGES[page.error]}
          action={{ href: retryHref, label: "Reintentar" }}
        />
      </div>
    );
  }

  if (page.data.items.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? "Todavía no hay encuestas"}
        description={empty?.description ?? "Sé la primera persona en preguntar algo."}
        action={empty ? empty.action : { href: "/create", label: "Crear la primera encuesta" }}
      />
    );
  }

  return (
    <div role="feed" aria-label="Encuestas" className="grid items-start gap-3 md:grid-cols-2">
      {page.data.items.map(({ poll, viewer, saved }) => (
        <PollCard key={poll.id} poll={poll} viewer={viewer} saved={saved} now={now} />
      ))}
      <FeedMore
        cursor={page.data.nextCursor}
        seenIds={page.data.items.map(({ poll }) => poll.id)}
        loadMore={loadMore}
        now={now}
      />
    </div>
  );
}
