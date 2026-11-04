"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";

// Zona de peligro «Eliminar cuenta» de Ajustes (ACCOUNT-002, D-049). El borrado es inmediato e
// irreversible, así que exige escribir el @usuario (o ELIMINAR si la cuenta no tiene perfil) en un
// diálogo modal nativo con rol alertdialog: atrapa el foco, se cierra con Escape y devuelve el foco
// al botón. Si la acción funciona, el servidor cierra la sesión y redirige: aquí no vuelve nada.
export function DeleteAccount({
  username,
  onDelete,
  onReconcile,
}: {
  username: string | null;
  onDelete: (confirm: string) => Promise<Result<void>>;
  onReconcile: () => Promise<Result<void>>;
}) {
  const id = useId();
  const expected = username ?? "ELIMINAR";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (!open || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    field.current?.focus();
  }, [open]);

  const matches = text.toLowerCase() === expected.toLowerCase();

  function show() {
    setText("");
    setError(null);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current || !matches) return;
    sending.current = true;
    setPending(true);
    setError(null);
    let result = await onDelete(text).catch(
      (): Result<void> => ({ ok: false, error: "NETWORK_ERROR" }),
    );
    // Tras un fallo de red no se sabe si llegó a borrarse: se pregunta antes de mostrar el error.
    // Si la cuenta ya no existe, la acción de reconciliar cierra la sesión y redirige.
    if (!result.ok && result.error === "NETWORK_ERROR") {
      result = await onReconcile().catch(
        (): Result<void> => ({ ok: false, error: "NETWORK_ERROR" }),
      );
    }
    sending.current = false;
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <section
      id="eliminar"
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-2xl border border-danger p-4"
    >
      <h3 id={`${id}-title`} className="text-base font-semibold text-danger">
        Eliminar cuenta
      </h3>
      <p className="text-[13px] text-muted">
        Se borrarán tu perfil, tus encuestas, tus votos, tus comentarios y tus relaciones. No se
        puede deshacer. Tu @usuario no estará disponible para nadie durante 30 días.
      </p>
      <a href="#descargar" className="self-start text-sm font-semibold underline">
        Antes, descarga una copia de tus datos
      </a>
      <div>
        <button
          ref={trigger}
          type="button"
          onClick={show}
          className="min-h-11 rounded-full border border-danger px-5 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-surface"
        >
          Eliminar mi cuenta
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
            // Mientras se borra no se puede cerrar: la petición ya está en marcha.
            if (sending.current) event.preventDefault();
          }}
          className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-danger bg-surface p-5 text-foreground backdrop:bg-accent-foreground/65"
        >
          <form onSubmit={confirm} noValidate className="flex flex-col gap-4">
            <h2 id={`${id}-dialog-title`} className="text-lg font-semibold">
              Eliminar tu cuenta para siempre
            </h2>
            <p id={`${id}-dialog-text`} className="text-sm text-muted">
              Es inmediato y no se puede deshacer.
            </p>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-confirm`} className="text-[15px] font-semibold">
                {username
                  ? `Escribe tu usuario (${username}) para confirmar`
                  : "Escribe ELIMINAR para confirmar"}
              </label>
              <input
                ref={field}
                id={`${id}-confirm`}
                type="text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={pending}
                className="w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] focus:border-foreground"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {ERROR_MESSAGES[error]}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!matches || pending}
                className="min-h-11 rounded-xl border border-danger bg-danger px-5 text-sm font-semibold text-surface disabled:opacity-50"
              >
                {pending ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => dialog.current?.close()}
                className="min-h-11 rounded-xl border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </dialog>
      )}
    </section>
  );
}
