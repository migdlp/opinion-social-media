import Link from "next/link";
import { notFound } from "next/navigation";
import {
  followAction,
  loadMoreProfilePolls,
  loadMoreProfileVotes,
  unfollowAction,
} from "@/app/follow-actions";
import { loadMoreSaved } from "@/app/save-actions";
import { EmptyState } from "@/components/empty-state";
import { FeedList } from "@/components/feed-list";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileVotes } from "@/components/profile-votes";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import {
  countFollowRequests,
  getProfilePolls,
  getProfileView,
  getProfileVotes,
  getSavedPolls,
} from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ username: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Pestañas subrayadas, las mismas que Recientes/Siguiendo en el feed (DESIGN-004).
const TAB =
  "inline-flex min-h-11 items-center border-b-2 px-1 text-[15px] transition-colors border-transparent text-muted hover:border-field";
const TAB_SELECTED =
  "inline-flex min-h-11 items-center border-b-2 px-1 text-[15px] transition-colors border-foreground font-semibold text-foreground";

const TABS = [
  { id: "creadas", label: "Creadas" },
  { id: "votadas", label: "Votadas" },
  { id: "guardadas", label: "Guardadas" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Página de perfil (V2-006): cabecera, botón de seguir y pestañas «Creadas» y «Votadas». La
// pestaña activa va en la URL (?tab=votadas). Una cuenta privada sin acceso sólo muestra la
// cabecera y el aviso: sus encuestas y votos no se piden ni llegan al HTML. Dinámica y sin caché
// compartida (lee la sesión de las cookies).
export async function ProfileContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username } = await params;
  const requestedTab = first((await searchParams).tab);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  const profile = await getProfileView(supabase, decodeURIComponent(username));
  if (!profile.ok) {
    if (profile.error === "USER_NOT_FOUND") notFound();
    return (
      <div role="alert" className="mx-auto w-full max-w-content">
        <EmptyState
          title="No se ha podido cargar el perfil"
          description={ERROR_MESSAGES[profile.error]}
          action={{ href: `/u/${username}`, label: "Reintentar" }}
        />
      </div>
    );
  }
  const view = profile.data;
  // «Guardadas» es privada (S-9): sólo existe en el perfil propio.
  const tabs = TABS.filter((t) => t.id !== "guardadas" || view.viewerRelation === "self");
  const tab: TabId = tabs.find((t) => t.id === requestedTab)?.id ?? "creadas";
  // El indicador de solicitudes sólo existe en el perfil propio; si falla, se omite sin romper.
  const requests = view.viewerRelation === "self" ? await countFollowRequests(supabase) : null;

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <ProfileHeader
        profile={view}
        pendingRequests={requests?.ok ? requests.data : 0}
        signedIn={signedIn}
        onFollow={followAction}
        onUnfollow={unfollowAction}
      />
      {view.canViewContent ? (
        <>
          <nav aria-label="Contenido del perfil" className="flex gap-6">
            {tabs.map(({ id, label }) => (
              <Link
                key={id}
                href={id === "creadas" ? `/u/${view.username}` : `/u/${view.username}?tab=${id}`}
                aria-current={tab === id ? "page" : undefined}
                className={tab === id ? TAB_SELECTED : TAB}
              >
                {label}
              </Link>
            ))}
          </nav>
          {tab === "creadas" && <CreatedTab username={view.username} signedIn={signedIn} />}
          {tab === "votadas" && <VotedTab username={view.username} />}
          {tab === "guardadas" && <SavedTab />}
        </>
      ) : (
        <p className="poll-surface p-5">
          Esta cuenta es privada. Síguela para ver sus encuestas y votos.
        </p>
      )}
    </div>
  );
}

async function CreatedTab({ username, signedIn }: { username: string; signedIn: boolean }) {
  const supabase = await createClient();
  const page = await getProfilePolls(supabase, username, null, { signedIn });
  return (
    <FeedList
      page={page}
      loadMore={loadMoreProfilePolls.bind(null, username)}
      empty={{
        title: "Todavía no ha creado encuestas",
        description: "Cuando publique alguna, aparecerá aquí.",
      }}
    />
  );
}

async function VotedTab({ username }: { username: string }) {
  const supabase = await createClient();
  const page = await getProfileVotes(supabase, username, null);
  if (!page.ok && page.error === "VOTES_PRIVATE") {
    // Estado esperado, no un fallo: sin «Reintentar» ni datos del historial (PRIV-002).
    return <p className="poll-surface p-5">{ERROR_MESSAGES.VOTES_PRIVATE}</p>;
  }
  if (!page.ok) {
    return (
      <div role="alert">
        <EmptyState
          title="No se han podido cargar los votos"
          description={ERROR_MESSAGES[page.error]}
          action={{ href: `/u/${username}?tab=votadas`, label: "Reintentar" }}
        />
      </div>
    );
  }
  return (
    <ProfileVotes
      username={username}
      initialVotes={page.data.votes}
      initialCursor={page.data.nextCursor}
      loadMore={loadMoreProfileVotes.bind(null, username)}
    />
  );
}

async function SavedTab() {
  const supabase = await createClient();
  const page = await getSavedPolls(supabase, null);
  return (
    <FeedList
      page={page}
      loadMore={loadMoreSaved}
      empty={{
        title: "Todavía no has guardado ninguna encuesta",
        description: "Usa el marcador de una encuesta para volver a ella más tarde.",
      }}
    />
  );
}
