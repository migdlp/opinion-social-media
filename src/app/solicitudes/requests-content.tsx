import { redirect } from "next/navigation";
import { loadMoreRequests, respondRequestAction } from "@/app/follow-actions";
import { EmptyState } from "@/components/empty-state";
import { FollowList } from "@/components/follow-list";
import { loginPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { listFollowRequests } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

// Bandeja de solicitudes de seguimiento (V2-009): sólo de la cuenta propia. Sin sesión lleva al
// login. Dinámica y sin caché compartida.
export async function RequestsContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(loginPath("/solicitudes"));

  const page = await listFollowRequests(supabase, null);
  if (!page.ok) {
    if (page.error === "AUTH_REQUIRED") redirect(loginPath("/solicitudes"));
    return (
      <div role="alert">
        <EmptyState
          title="No se han podido cargar las solicitudes"
          description={ERROR_MESSAGES[page.error]}
          action={{ href: "/solicitudes", label: "Reintentar" }}
        />
      </div>
    );
  }
  return (
    <FollowList
      initialUsers={page.data.users}
      initialCursor={page.data.nextCursor}
      loadMore={loadMoreRequests}
      emptyText="No tienes solicitudes pendientes."
      onRespond={respondRequestAction}
    />
  );
}
