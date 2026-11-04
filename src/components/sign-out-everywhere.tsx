"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";

const networkFailure = (): Result<void> => ({ ok: false, error: "NETWORK_ERROR" });

// Apartado «Sesiones» de Ajustes → Cuenta (AUTH-002): cierra la sesión aquí y en cualquier otro
// dispositivo. Pide confirmación en un diálogo modal nativo con rol alertdialog: atrapa el foco, se
// cierra con Escape y devuelve el foco al botón. Si la acción funciona, el servidor cierra la sesión
// y redirige: aquí no vuelve nada. Si falla, el error aparece dentro del diálogo y la sesión local
// sigue abierta.
export function SignOutEverywhere({ onSignOut }: { onSignOut: () => Promise<Result<void>> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (!open || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    cancel.current?.focus();
  }, [open]);

  function show() {
    setError(null);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError(null);
    const result = await onSignOut().catch(networkFailure);
    sending.current = false;
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <section id="sesiones" aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h3 id={`${id}-title`} className="text-base font-semibold">
        Sesiones
      </h3>
      <p className="text-[13px] text-muted">
        Cierra tu sesión aquí y en cualquier otro dispositivo donde hayas entrado.
      </p>
      <div>
        <button
          ref={trigger}
          type="button"
          onClick={show}
          className="min-h-11 rounded-full border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground"
        >
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
      {open && (
        <dialog
          ref={dialog}
          role="alertdialog"
          aria-labelledby={`${id}-dialog-title`}
          aria-describedby={`${id}-dialog-text`}
          onClose={onClose}
          onCancel={(event) => {
            // Mientras se cierra no se puede cancelar: la petición ya está en marcha.
            if (sending.current) event.preventDefault();
          }}
          className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-field bg-surface p-5 text-foreground backdrop:bg-accent-foreground/65"
        >
          <div className="flex flex-col gap-4">
            <h2 id={`${id}-dialog-title`} className="text-lg font-semibold">
              Cerrar sesión en todos los dispositivos
            </h2>
            <p id={`${id}-dialog-text`} className="text-sm text-muted">
              Se cerrará tu sesión en todos tus dispositivos. En los demás puede tardar hasta una
              hora en hacerse efectivo.
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {ERROR_MESSAGES[error]}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className="min-h-11 rounded-xl border border-foreground bg-foreground px-5 text-sm font-semibold text-surface disabled:opacity-50"
              >
                {pending ? "Cerrando…" : "Cerrar todas"}
              </button>
              <button
                ref={cancel}
                type="button"
                disabled={pending}
                onClick={() => dialog.current?.close()}
                className="min-h-11 rounded-xl border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
