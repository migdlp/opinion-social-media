"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, FollowEntry, FollowPage, Result } from "@/lib/data/types";

type FollowListProps = {
  initialUsers: FollowEntry[];
  initialCursor: string | null;
  loadMore: (cursor: string) => Promise<Result<FollowPage>>;
  emptyText: string;
  // Sólo en «Seguidores» de la cuenta propia: «Eliminar» con confirmación (V2-009).
  onRemove?: (username: string) => Promise<Result<void>>;
  // Sólo en la bandeja de solicitudes: «Aceptar» y «Rechazar».
  onRespond?: (username: string, accept: boolean) => Promise<Result<void>>;
  // Sólo en la lista de cuentas bloqueadas (SOCIAL-002): «Desbloquear» con confirmación. Sus filas
  // no enlazan al perfil, que para quien bloqueó no existe.
  onUnblock?: (username: string) => Promise<Result<void>>;
};

const SMALL =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50";
const PRIMARY = `${SMALL} action-primary`;
const SECONDARY = `${SMALL} border border-field hover:border-foreground`;

// Lista paginada de personas (V2-009): seguidores, seguidos o solicitudes. Cada fila enlaza a su
// perfil; las acciones de gestión sólo existen cuando la página las pasa (cuenta propia). La
// interfaz es optimista sólo cuando el servidor confirma: si falla, la fila se conserva y se
// explica el motivo.
export function FollowList({
  initialUsers,
  initialCursor,
  loadMore,
  emptyText,
  onRemove,
  onRespond,
  onUnblock,
}: FollowListProps) {
  const [users, setUsers] = useState(initialUsers);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<AppErrorCode | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ username: string; error: AppErrorCode } | null>(null);
  const seen = useRef(new Set(initialUsers.map((u) => u.username)));
  const sending = useRef(false);

  async function handleMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setLoadError(null);
    const page = await loadMore(cursor).catch((): Result<FollowPage> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    setLoading(false);
    if (!page.ok) {
      setLoadError(page.error);
      return;
    }
    const fresh = page.data.users.filter((u) => !seen.current.has(u.username));
    fresh.forEach((u) => seen.current.add(u.username));
    setUsers((previous) => [...previous, ...fresh]);
    setCursor(page.data.nextCursor);
  }

  // `gone` indica qué errores significan que la fila ya no existe (p. ej. la solicitud se retiró
  // desde otra pestaña): se quita igualmente en lugar de dejar un botón que nunca funcionará.
  async function run(username: string, action: () => Promise<Result<void>>, gone?: AppErrorCode) {
    if (sending.current) return;
    sending.current = true;
    setBusy(username);
    setRowError(null);
    const result = await action().catch((): Result<void> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setBusy(null);
    setConfirming(null);
    if (result.ok || result.error === gone) {
      setUsers((previous) => previous.filter((u) => u.username !== username));
      return;
    }
    setRowError({ username, error: result.error });
  }

  if (users.length === 0 && !cursor) {
    return <p className="poll-surface p-5 text-muted">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {users.map((entry) => (
          <li key={entry.username} className="poll-surface flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {onUnblock ? (
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar
                    username={entry.username}
                    displayName={entry.displayName}
                    icon={entry.avatarIcon}
                  />
                  <span className="flex min-w-0 flex-col">
                    {entry.displayName && (
                      <span className="truncate font-semibold">{entry.displayName}</span>
                    )}
                    <span
                      className={`truncate ${entry.displayName ? "text-muted" : "font-semibold"}`}
                    >
                      @{entry.username}
                    </span>
                  </span>
                </span>
              ) : (
                <Link
                  href={`/u/${entry.username}`}
                  className="flex min-w-0 items-center gap-3 hover:underline"
                >
                  <Avatar
                    username={entry.username}
                    displayName={entry.displayName}
                    icon={entry.avatarIcon}
                  />
                  <span className="flex min-w-0 flex-col">
                    {entry.displayName && (
                      <span className="truncate font-semibold">{entry.displayName}</span>
                    )}
                    <span
                      className={`truncate ${entry.displayName ? "text-muted" : "font-semibold"}`}
                    >
                      @{entry.username}
                    </span>
                  </span>
                </Link>
              )}
              {onRespond && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={PRIMARY}
                    disabled={busy === entry.username}
                    onClick={() =>
                      run(entry.username, () => onRespond(entry.username, true), "USER_NOT_FOUND")
                    }
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className={SECONDARY}
                    disabled={busy === entry.username}
                    onClick={() =>
                      run(entry.username, () => onRespond(entry.username, false), "USER_NOT_FOUND")
                    }
                  >
                    Rechazar
                  </button>
                </div>
              )}
              {(onRemove ?? onUnblock) &&
                (confirming === entry.username ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={PRIMARY}
                      disabled={busy === entry.username}
                      onClick={() =>
                        run(entry.username, () => (onRemove ?? onUnblock)!(entry.username))
                      }
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className={SECONDARY}
                      disabled={busy === entry.username}
                      onClick={() => setConfirming(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={SECONDARY}
                    onClick={() => {
                      setRowError(null);
                      setConfirming(entry.username);
                    }}
                  >
                    {onUnblock ? "Desbloquear" : "Eliminar"}
                  </button>
                ))}
            </div>
            {onUnblock && confirming === entry.username && (
              <p className="text-sm text-muted">
                Desbloquear no restaura los seguimientos anteriores: tendréis que volver a seguiros.
              </p>
            )}
            {rowError?.username === entry.username && (
              <p role="alert" className="text-sm text-danger">
                {ERROR_MESSAGES[rowError.error]}
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-2 py-2">
        {loadError && (
          <p role="alert" className="text-center text-sm text-danger">
            {ERROR_MESSAGES[loadError]}
          </p>
        )}
        {cursor ? (
          <button
            type="button"
            onClick={handleMore}
            disabled={loading}
            aria-busy={loading}
            className="min-h-11 rounded-full border border-field bg-surface px-5 text-sm font-semibold transition-colors hover:border-foreground disabled:cursor-wait disabled:text-muted"
          >
            {loading ? "Cargando…" : "Cargar más"}
          </button>
        ) : (
          <p className="text-sm text-muted">{users.length === 0 ? emptyText : "No hay más"}</p>
        )}
      </div>
    </div>
  );
}
