import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PollDetailView } from "@/components/poll-detail-view";
import { castVote, loadOwnVote } from "@/app/vote-actions";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { getMyProfile, getPollCommentsEnabled, getPollDetail } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";
import { CommentsSection } from "./comments-section";
import { isClosed } from "@/lib/utils/date";

// Detalle de /polls/[id], cargado en el servidor por petición. Mal formada,
// inexistente u oculta son indistinguibles (POLL_UNAVAILABLE) y responden 404;
// cualquier otro fallo es un error recuperable.
export async function PollDetailLoader({ id, option }: { id: string; option?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);
  // El ajuste de comentarios y el perfil propio (para saber si es la autora) no dependen del detalle
  // y se piden a la vez; un fallo en ellos no impide ver la encuesta.
  const [detail, comments, mine] = await Promise.all([
    getPollDetail(supabase, id, { signedIn }),
    getPollCommentsEnabled(supabase, id),
    signedIn ? getMyProfile(supabase) : Promise.resolve(null),
  ]);

  if (!detail.ok) {
    if (detail.error === "POLL_UNAVAILABLE") notFound();
    return (
      <div role="alert" className="mx-auto w-full max-w-content">
        <EmptyState
          title="No se ha podido cargar la encuesta"
          description={ERROR_MESSAGES[detail.error]}
          action={{ href: `/polls/${id}`, label: "Reintentar" }}
        />
      </div>
    );
  }

  const username = mine?.ok ? mine.data?.username : null;
  const isAuthor = Boolean(username) && detail.data.poll.author?.username === username;

  // Se resuelve aquí (componente de servidor asíncrono) para que el detalle y el debate lleguen juntos.
  const discussion = await CommentsSection({
    pollId: id,
    enabled: comments.ok && comments.data,
    isAuthor,
    signedIn,
    closed: isClosed(detail.data.poll.closesAt, new Date()),
    viewer: detail.data.viewer,
  });

  return (
    <>
      <PollDetailView
        detail={detail.data}
        castVote={castVote}
        loadOwnVote={loadOwnVote}
        initialSelected={option}
      />
      {discussion}
    </>
  );
}
