"use client";

import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result, VoteVisibility } from "@/lib/data/types";

type VoteVisibilityPickerProps = {
  value: VoteVisibility;
  onChange: (value: VoteVisibility) => Promise<Result<void>>;
};

const OPTIONS: { value: VoteVisibility; label: string; description: string }[] = [
  {
    value: "private",
    label: "Solo yo",
    description: "Nadie más ve qué encuestas has votado ni tu opción.",
  },
  {
    value: "followers",
    label: "Seguidores aceptados",
    description: "Sólo quienes te siguen y has aceptado.",
  },
  {
    value: "profile",
    label: "Según la privacidad de la cuenta",
    description: "Cualquiera si tu cuenta es pública; sólo tus seguidores si es privada.",
  },
];

// Audiencia del historial de votos (PRIV-002). Independiente de «Cuenta privada»: sólo
// restringe, nunca amplía. La audiencia la impone Supabase; aquí se muestra el valor guardado
// y, si el guardado falla, se conserva el anterior.
export function VoteVisibilityPicker({ value, onChange }: VoteVisibilityPickerProps) {
  const id = useId();
  const [selected, setSelected] = useState(value);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<AppErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);

  async function choose(next: VoteVisibility) {
    if (next === selected || sending.current) return;
    sending.current = true;
    const previous = selected;
    // Se marca al instante para que el control responda; si el guardado falla, se revierte.
    setSelected(next);
    setPending(true);
    setSaved(false);
    setFailure(null);
    const result = await onChange(next).catch((): Result<void> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setPending(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setSelected(previous);
      setFailure(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-labelledby={`${id}-legend`}
        aria-describedby={`${id}-note`}
        aria-busy={pending || undefined}
        className="flex flex-col gap-2"
      >
        <p id={`${id}-legend`} className="text-[15px] font-semibold">
          Quién puede ver las encuestas que votas
        </p>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-foreground has-[:checked]:border-(--option-selected-border) has-[:checked]:bg-(--option-selected)"
          >
            <input
              type="radio"
              name={`${id}-audience`}
              value={option.value}
              checked={selected === option.value}
              onChange={() => void choose(option.value)}
              aria-labelledby={`${id}-${option.value}-name`}
              aria-describedby={`${id}-${option.value}-desc`}
              className="mt-1 size-4 shrink-0 accent-[var(--foreground)]"
            />
            <span className="flex flex-col">
              <span id={`${id}-${option.value}-name`} className="text-[15px] font-medium">
                {option.label}
              </span>
              <span id={`${id}-${option.value}-desc`} className="text-[13px] text-muted">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p id={`${id}-note`} className="text-[13px] text-muted">
        Ocultar tu historial no retira tus votos ni cambia los resultados agregados y anónimos.
      </p>
      {saved && (
        <p role="status" className="text-sm font-medium">
          Audiencia guardada.
        </p>
      )}
      {failure && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[failure]} Se mantiene la audiencia anterior.
        </p>
      )}
    </div>
  );
}
