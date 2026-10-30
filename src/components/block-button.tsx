"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50";
const SECONDARY = `${BUTTON} border border-field hover:border-foreground`;
const PRIMARY = `${BUTTON} action-primary`;

// Bloquear a otra persona desde su perfil (SOCIAL-002). Pide una confirmación que explica el
// efecto antes de llamar al servidor. No hay estado optimista: sólo cuando el servidor confirma
// se lleva a la lista de Ajustes, porque para quien bloquea el perfil ya no existe. Desbloquear
// se hace en esa lista.
export function BlockButton({
  username,
  onBlock,
}: {
  username: string;
  onBlock: (username: string) => Promise<Result<void>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const sending = useRef(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
    trigger.current?.focus();
  }

  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    const result = await onBlock(username).catch((): Result<void> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setPending(false);
    if (result.ok) router.push("/settings#bloqueados");
    else setError(result.error);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        ref={trigger}
        type="button"
        className={SECONDARY}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Bloquear
      </button>
      {open && (
        <div
          ref={panel}
          tabIndex={-1}
          role="group"
          aria-label={`Bloquear a @${username}`}
          className="poll-surface flex max-w-sm flex-col gap-3 p-4 text-sm"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <p className="font-semibold">¿Bloquear a @{username}?</p>
          <p>
            Dejaréis de seguiros y no os veréis el contenido protegido. No se lo notificamos y
            puedes desbloquearla en Ajustes, aunque eso no restaura los seguimientos.
          </p>
          <p className="text-muted">
            Las encuestas públicas pueden seguir viéndose sin iniciar sesión: bloquear no las oculta
            del todo.
          </p>
          <div className="flex gap-2">
            <button type="button" className={PRIMARY} disabled={pending} onClick={confirm}>
              Sí, bloquear
            </button>
            <button type="button" className={SECONDARY} disabled={pending} onClick={close}>
              Cancelar
            </button>
          </div>
          {error && (
            <p role="alert" className="text-danger">
              {ERROR_MESSAGES[error]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
