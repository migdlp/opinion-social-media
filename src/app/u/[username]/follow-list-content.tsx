import Link from "next/link";
import { notFound } from "next/navigation";
import { loadMoreFollowers, loadMoreFollowing, removeFollowerAction } from "@/app/follow-actions";
import { EmptyState } from "@/components/empty-state";
import { FollowList } from "@/components/follow-list";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { getProfileView, listFollowers, listFollowing } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

type Kind = "seguidores" | "siguiendo";

// Lista de seguidores o de seguidos (V2-009), con las mismas reglas que el contenido del perfil:
// una cuenta privada sin acceso sólo muestra el aviso y su lista no se pide. En la lista de
// seguidores de la cuenta propia se ofrece «Eliminar». Dinámica y sin caché compartida.
export async function FollowListContent({
  params,
  kind,
}: {
  params: Promise<{ username: string }>;
  kind: Kind;
}) {
  const username = decodeURIComponent((await params).username);
  const supabase = await createClient();

  const profile = await getProfileView(supabase, username);
  if (!profile.ok) {
    if (profile.error === "USER_NOT_FOUND") notFound();
    return <LoadError message={ERROR_MESSAGES[profile.error]} href={`/u/${username}/${kind}`} />;
  }
  const view = profile.data;
  const title = kind === "seguidores" ? "Seguidores de" : "Siguiendo a";

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`/u/${view.username}`}
          className="-my-1.5 py-1.5 text-sm text-muted hover:underline"
        >
          ← Volver al perfil
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {title} @{view.username}
        </h1>
      </div>
      {view.canViewContent ? (
        <People kind={kind} username={view.username} isSelf={view.viewerRelation === "self"} />
      ) : (
        <p className="rounded-2xl border border-border bg-surface p-5">
          Esta cuenta es privada. Síguela para ver sus seguidores y a quién sigue.
        </p>
      )}
    </div>
  );
}

async function People({
  kind,
  username,
  isSelf,
}: {
  kind: Kind;
  username: string;
  isSelf: boolean;
}) {
  const supabase = await createClient();
  const page =
    kind === "seguidores"
      ? await listFollowers(supabase, username, null)
      : await listFollowing(supabase, username, null);
  if (!page.ok) {
    if (page.error === "PROFILE_PRIVATE") {
      return (
        <p className="rounded-2xl border border-border bg-surface p-5">
          Esta cuenta es privada. Síguela para ver sus seguidores y a quién sigue.
        </p>
      );
    }
    return <LoadError message={ERROR_MESSAGES[page.error]} href={`/u/${username}/${kind}`} />;
  }
  return (
    <FollowList
      initialUsers={page.data.users}
      initialCursor={page.data.nextCursor}
      loadMore={(kind === "seguidores" ? loadMoreFollowers : loadMoreFollowing).bind(
        null,
        username,
      )}
      emptyText={
        kind === "seguidores" ? "Todavía no tiene seguidores." : "Todavía no sigue a nadie."
      }
      onRemove={isSelf && kind === "seguidores" ? removeFollowerAction : undefined}
    />
  );
}

function LoadError({ message, href }: { message: string; href: string }) {
  return (
    <div role="alert" className="mx-auto w-full max-w-content">
      <EmptyState
        title="No se ha podido cargar la lista"
        description={message}
        action={{ href, label: "Reintentar" }}
      />
    </div>
  );
}
