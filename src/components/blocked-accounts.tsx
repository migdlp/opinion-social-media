"use client";

import { useId } from "react";
import { loadMoreBlocked, unblockAction } from "@/app/block-actions";
import { FollowList } from "@/components/follow-list";
import type { FollowEntry } from "@/lib/data/types";

// Apartado «Cuentas bloqueadas» de Ajustes (SOCIAL-002): sólo los bloqueos propios, con
// Desbloquear. Nunca muestra quién ha bloqueado a la cuenta.
export function BlockedAccounts({
  users,
  nextCursor,
}: {
  users: FollowEntry[];
  nextCursor: string | null;
}) {
  const id = useId();
  return (
    <section id="bloqueados" aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold tracking-[-0.01em]">
          Cuentas bloqueadas
        </h2>
        <p className="text-[13px] text-muted">
          No os veréis el contenido protegido ni podréis seguiros. Las encuestas públicas pueden
          seguir viéndose sin iniciar sesión.
        </p>
      </div>
      <FollowList
        initialUsers={users}
        initialCursor={nextCursor}
        loadMore={loadMoreBlocked}
        emptyText="No has bloqueado a nadie."
        onUnblock={unblockAction}
      />
    </section>
  );
}
