import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PollDetailView } from "@/components/poll-detail-view";
import { castVote, loadOwnVote } from "@/app/vote-actions";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { getPollDetail } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

// Detalle de /polls/[id], cargado en el servidor por petición. Mal formada,
// inexistente u oculta son indistinguibles (POLL_UNAVAILABLE) y responden 404;
// cualquier otro fallo es un error recuperable.
export async function PollDetailLoader({ id, option }: { id: string; option?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const detail = await getPollDetail(supabase, id, { signedIn: Boolean(data.user) });

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

  return (
    <PollDetailView
      detail={detail.data}
      castVote={castVote}
      loadOwnVote={loadOwnVote}
      initialSelected={option}
    />
  );
}
