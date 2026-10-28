import { EmptyState } from "@/components/empty-state";
import { FeedControls, feedHref } from "@/components/feed-controls";
import { FeedList } from "@/components/feed-list";
import { loginPath } from "@/lib/auth/redirect";
import { getCategories, getFeed, hasAcceptedFollows } from "@/lib/data/operations";
import type { FeedMode } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";
import { loadMoreFeed } from "./feed-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Feed de «/» (V2-032): Recientes o Siguiendo, con filtro de categoría, ambos en la URL
// (?tab=siguiendo&categoria=deportes). Sin pestaña explícita, un visitante entra en Recientes y una
// cuenta con algún seguimiento ACEPTADO entra en Siguiendo (las solicitudes pendientes no cuentan).
// Se carga en el servidor por petición (lee la sesión de las cookies, así que nunca se cachea). Las
// páginas siguientes llegan con loadMoreFeed.
export async function Feed({ searchParams }: { searchParams?: SearchParams } = {}) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const signedIn = Boolean(user);

  const categories = await getCategories(supabase);
  const list = categories.ok ? categories.data : [];
  const requestedCategory = first(params.categoria);
  const category = list.some((c) => c.slug === requestedCategory)
    ? (requestedCategory ?? null)
    : null;

  const requestedTab = first(params.tab);
  const explicit: FeedMode | null =
    requestedTab === "recientes" || requestedTab === "siguiendo" ? requestedTab : null;
  const mode: FeedMode =
    explicit ?? (user && (await hasAcceptedFollows(supabase, user.id)) ? "siguiendo" : "recientes");

  const controls = (
    <FeedControls mode={mode} category={category} categories={list} signedIn={signedIn} />
  );

  if (mode === "siguiendo" && !signedIn) {
    return (
      <div className="flex flex-col gap-4">
        {controls}
        <EmptyState
          title="Inicia sesión para ver a quien sigues"
          description="Siguiendo reúne las encuestas de las cuentas que sigues."
          action={{ href: loginPath(feedHref(mode, category)), label: "Iniciar sesión" }}
        />
      </div>
    );
  }

  const page = await getFeed(supabase, { mode, category }, { signedIn });
  const empty =
    mode === "siguiendo"
      ? {
          title: "Todavía no hay encuestas de quienes sigues",
          description:
            "Las cuentas que sigues todavía no tienen encuestas visibles. Cuando publiquen, aparecerán aquí.",
          action: { href: feedHref("recientes", category), label: "Ver Recientes" },
        }
      : category
        ? {
            title: "No hay encuestas en esta categoría",
            description: "Prueba con otra categoría o vuelve a Todas.",
            action: { href: feedHref(mode, null), label: "Ver todas" },
          }
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      {controls}
      {/* La clave reinicia las filas y el cursor al cambiar de lista o de categoría. */}
      <FeedList
        key={`${mode}:${category ?? ""}`}
        page={page}
        loadMore={loadMoreFeed.bind(null, mode, category)}
        empty={empty}
        retryHref={feedHref(mode, category)}
      />
    </div>
  );
}
