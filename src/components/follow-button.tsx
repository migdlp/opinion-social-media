"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { loginPath, onboardingPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result, ViewerRelation } from "@/lib/data/types";

type FollowButtonProps = {
  username: string;
  relation: ViewerRelation;
  signedIn: boolean;
  onFollow: (username: string) => Promise<Result<"accepted" | "pending">>;
  onUnfollow: (username: string) => Promise<Result<void>>;
};

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50";
const PRIMARY = `${BUTTON} action-primary`;
const SECONDARY = `${BUTTON} border border-field hover:border-foreground`;

// Botón de la cabecera del perfil según la relación (V2-006): Seguir, Solicitado (cancela),
// Siguiendo (deja de seguir, con confirmación) o Editar perfil (propio). El cambio es inmediato
// y sin recargar; si el servidor falla, se conserva el estado anterior y se explica el motivo.
export function FollowButton({
  username,
  relation,
  signedIn,
  onFollow,
  onUnfollow,
}: FollowButtonProps) {
  const [current, setCurrent] = useState<ViewerRelation>(relation);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const sending = useRef(false);
  const profilePath = `/u/${username}`;

  if (current === "self") {
    return (
      <Link href="/settings" className={SECONDARY}>
        Editar perfil
      </Link>
    );
  }
  if (!signedIn) {
    return (
      <Link href={loginPath(profilePath)} className={PRIMARY}>
        Seguir
      </Link>
    );
  }

  async function run(action: () => Promise<Result<ViewerRelation>>) {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    const result = await action().catch((): Result<ViewerRelation> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setPending(false);
    if (result.ok) setCurrent(result.data);
    else setError(result.error);
  }

  const follow = () =>
    run(async () => {
      const result = await onFollow(username);
      return result.ok
        ? { ok: true, data: result.data === "pending" ? "pending" : "following" }
        : result;
    });
  const unfollow = () =>
    run(async () => {
      const result = await onUnfollow(username);
      return result.ok ? { ok: true, data: "none" } : result;
    });

  const label =
    current === "pending" ? "Solicitado" : current === "following" ? "Siguiendo" : "Seguir";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        className={current === "none" ? PRIMARY : SECONDARY}
        onClick={() => {
          if (current === "none") return follow();
          if (current === "following" && !window.confirm(`¿Dejar de seguir a @${username}?`))
            return;
          return unfollow();
        }}
      >
        {label}
      </button>
      {error === "PROFILE_REQUIRED" ? (
        <p className="text-sm">
          Elige tu usuario para seguir.{" "}
          <Link href={onboardingPath(profilePath)} className="font-semibold underline">
            Elegir mi usuario
          </Link>
        </p>
      ) : error === "AUTH_REQUIRED" ? (
        <p className="text-sm">
          Inicia sesión para seguir.{" "}
          <Link href={loginPath(profilePath)} className="font-semibold underline">
            Iniciar sesión
          </Link>
        </p>
      ) : (
        error && (
          <p role="alert" className="text-sm text-danger">
            {ERROR_MESSAGES[error]}
          </p>
        )
      )}
    </div>
  );
}
