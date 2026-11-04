"use client";

import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { Result } from "@/lib/data/types";

type CommentsToggleProps = {
  pollId: string;
  enabled: boolean;
  setComments: (pollId: string, enabled: boolean) => Promise<Result<void>>;
  onChanged: () => void;
};

// Interruptor del autor en el detalle (CMT-002): activa o apaga el debate sin tocar nada más de la
// encuesta. Apagar no borra los comentarios; si falla, el interruptor vuelve a su estado.
export function CommentsToggle({ pollId, enabled, setComments, onChanged }: CommentsToggleProps) {
  const id = useId();
  const [checked, setChecked] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function change(next: boolean) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setChecked(next);
    const result = await setComments(pollId, next).catch((): Result<void> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    busy.current = false;
    setPending(false);
    if (result.ok) {
      onChanged();
      return;
    }
    setChecked(!next);
    setError(ERROR_MESSAGES[result.error]);
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`${id}-toggle`}
        className="flex min-h-11 items-center gap-3 text-[15px] font-semibold"
      >
        <input
          id={`${id}-toggle`}
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(event) => void change(event.target.checked)}
          aria-describedby={`${id}-help`}
          className="size-5 accent-[var(--accent)]"
        />
        Comentarios
      </label>
      <p id={`${id}-help`} className="text-[13px] text-muted">
        Apagarlos no borra los comentarios: se guardan y vuelven si los reactivas.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
