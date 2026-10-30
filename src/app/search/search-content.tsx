import { EmptyState } from "@/components/empty-state";
import { FeedList } from "@/components/feed-list";
import { SearchForm } from "@/components/search-form";
import { searchPolls } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";
import { loadMoreSearch } from "./search-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MIN_LENGTH = 2;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
// Mismo criterio que el servidor: espacios recortados y colapsados.
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

// Contenido de /search (SEARCH-002): la consulta está en la URL y nunca se busca «todo» de forma
// automática. Se carga en el servidor por petición, con la sesión de las cookies, y las páginas
// siguientes llegan con loadMoreSearch. Las tarjetas son las del feed (mismos permisos de voto).
export async function SearchContent({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const raw = first(params.q);
  const query = normalize(raw ?? "");

  if (!query) {
    return (
      <div className="flex flex-col gap-4">
        <SearchForm />
        <EmptyState
          title="Busca una encuesta"
          description="Escribe una palabra o una frase de la pregunta para encontrar encuestas."
        />
      </div>
    );
  }

  if (query.length < MIN_LENGTH) {
    return (
      <div className="flex flex-col gap-4">
        <SearchForm defaultValue={query} />
        <p role="status" className="text-sm text-muted">
          Escribe al menos 2 caracteres para buscar.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const page = await searchPolls(supabase, query, null, { signedIn: Boolean(data.user) });
  const retryHref = `/search?q=${encodeURIComponent(query)}`;

  return (
    <div className="flex flex-col gap-4">
      <SearchForm defaultValue={query} />
      {page.ok && page.data.items.length > 0 && (
        <p role="status" className="text-sm text-muted">
          Resultados para «{query}»
        </p>
      )}
      <FeedList
        key={query}
        page={page}
        loadMore={loadMoreSearch.bind(null, query)}
        retryHref={retryHref}
        empty={{
          title: "Sin resultados",
          description: `No hay ninguna encuesta con «${query}». Prueba con otra palabra.`,
          action: { href: "/", label: "Ver el feed" },
        }}
      />
    </div>
  );
}
