"use client";

import { useId, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";

type PrivacyToggleProps = {
  isPrivate: boolean;
  onChange: (isPrivate: boolean) => Promise<Result<null>>;
};

// Interruptor «Cuenta privada» (V2-008, D-017). Activarla pide confirmación; desactivarla
// se guarda directamente. Si el guardado falla, el estado visible no cambia.
export function PrivacyToggle({ isPrivate: initial, onChange }: PrivacyToggleProps) {
  const id = useId();
  const [isPrivate, setIsPrivate] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AppErrorCode | null>(null);

  async function apply(next: boolean) {
    setFailure(null);
    setPending(true);
    const result = await onChange(next).catch((): Result<null> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    setPending(false);
    setConfirming(false);
    if (result.ok) setIsPrivate(next);
    else setFailure(result.error);
  }

  function handleToggle() {
    if (pending) return;
    if (isPrivate) void apply(false);
    else setConfirming(true);
  }

  return (
    <section aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h3 id={`${id}-label`} className="text-[15px] font-semibold">
          Cuenta privada
        </h3>
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          disabled={pending}
          onClick={handleToggle}
          className="relative h-7 w-12 shrink-0 rounded-full border border-field bg-surface transition-colors aria-checked:border-foreground aria-checked:bg-foreground disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-foreground transition-transform aria-checked:bg-background ${isPrivate ? "translate-x-5 bg-background!" : ""}`}
          />
        </button>
      </div>
      <p id={`${id}-help`} className="text-[13px] text-muted">
        {isPrivate
          ? "Sólo tus seguidores ven tus encuestas y votos. Si vuelves a hacerla pública, se aceptarán las solicitudes pendientes."
          : "Cualquiera puede ver tus encuestas y votos. Si la haces privada, tendrás que aprobar a quien quiera seguirte."}
      </p>

      {confirming && (
        <div
          role="group"
          aria-label="Confirmar cuenta privada"
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <p className="text-sm">
            Tus encuestas y votos sólo los verán tus seguidores. Las personas que ya te siguen
            seguirán haciéndolo.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void apply(true)}
              className="min-h-11 rounded-full bg-foreground px-5 font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              Hacer privada
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="min-h-11 rounded-full border border-field px-5 font-semibold transition-colors hover:border-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {failure && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[failure]}
        </p>
      )}
    </section>
  );
}
