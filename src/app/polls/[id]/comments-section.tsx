import { CommentsPanel } from "@/components/comments-panel";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { listComments } from "@/lib/data/operations";
import type { PollViewerState } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

type CommentsSectionProps = {
  pollId: string;
  enabled: boolean;
  isAuthor: boolean;
  signedIn: boolean;
  closed: boolean;
  viewer: PollViewerState;
};

// Debate de una encuesta (CMT-002), cargado en el servidor. En una abierta sin voto NO se pide ni
// se envía ningún comentario (ni recuentos): sólo la explicación. En cerradas rige la visibilidad
// de la encuesta. Apagado: sólo la autora ve el interruptor. Un fallo al cargarlo no rompe la
// encuesta: se explica y se puede recargar.
export async function CommentsSection({
  pollId,
  enabled,
  isAuthor,
  signedIn,
  closed,
  viewer,
}: CommentsSectionProps) {
  if (!enabled && !isAuthor) return null;

  const voted = viewer.kind === "voted" || viewer.kind === "closed";
  const locked = enabled && !closed && !voted;

  let initial = null;
  if (enabled && !locked) {
    const supabase = await createClient();
    const page = await listComments(supabase, pollId, null);
    if (!page.ok) {
      return (
        <div role="alert" className="mx-auto w-full max-w-content py-4 text-sm text-danger">
          {ERROR_MESSAGES[page.error]}
        </div>
      );
    }
    initial = page.data;
  }

  return (
    <CommentsPanel
      pollId={pollId}
      enabled={enabled}
      isAuthor={isAuthor}
      signedIn={signedIn}
      initial={initial}
      locked={locked}
    />
  );
}
