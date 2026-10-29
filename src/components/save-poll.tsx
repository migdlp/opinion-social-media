"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { saveAction } from "@/app/save-actions";
import { loginPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode } from "@/lib/data/types";

const BUTTON =
  "relative z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-track focus-visible:bg-track";

function Bookmark({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

// Marcador «Guardar para luego» de una tarjeta o del detalle (V2-022). Con sesión cambia al
// instante y revierte, explicando el motivo, si el servidor falla; un visitante va al login y
// vuelve a la encuesta. La lista de guardadas es privada: nada de esto se ve desde fuera.
export function SavePoll({
  pollId,
  signedIn,
  initialSaved = false,
}: {
  pollId: string;
  signedIn: boolean;
  initialSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const sending = useRef(false);
  const returnTo = `/polls/${pollId}`;

  if (!signedIn || error === "AUTH_REQUIRED") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link href={loginPath(returnTo)} aria-label="Guardar para luego" className={BUTTON}>
          <Bookmark filled={false} />
        </Link>
        {error === "AUTH_REQUIRED" && (
          <p role="alert" className="text-sm">
            <Link href={loginPath(returnTo)} className="underline">
              Inicia sesión para guardar
            </Link>
          </p>
        )}
      </div>
    );
  }

  async function toggle() {
    if (sending.current) return;
    sending.current = true;
    const next = !saved;
    setSaved(next);
    setError(null);
    const result = await saveAction(pollId, next).catch(
      () => ({ ok: false, error: "NETWORK_ERROR" }) as const,
    );
    sending.current = false;
    if (!result.ok) {
      setSaved(!next);
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? "Quitar de guardadas" : "Guardar para luego"}
        className={BUTTON}
      >
        <Bookmark filled={saved} />
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[error]}
        </p>
      )}
    </div>
  );
}
