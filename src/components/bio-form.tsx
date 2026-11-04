"use client";

import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";
import { codePointLength } from "@/lib/utils/text";

const BIO_MAX = 280;
const TRIM = /^[ \t\r\n]+|[ \t\r\n]+$/g;

type BioFormProps = {
  initial?: string;
  onSave: (bio: string | null) => Promise<Result<void>>;
  // Tras guardar con éxito (el llamador refresca la página).
  onDone: () => void;
};

// Descripción opcional del perfil (PROFILE-002): texto plano de hasta 280 caracteres, con
// contador accesible. Es un formulario aparte del nombre y el @usuario, de modo que guardarla no
// toca otro dato del perfil. Los errores aparecen junto al campo y el texto escrito se conserva.
export function BioForm({ initial = "", onSave, onDone }: BioFormProps) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);

  const trimmed = text.replace(TRIM, "");
  const count = codePointLength(trimmed);
  const tooLong = count > BIO_MAX;
  const message = tooLong || error === "BIO_INVALID" ? ERROR_MESSAGES.BIO_INVALID : null;
  const failure = error && error !== "BIO_INVALID" ? error : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    setSaved(false);
    if (tooLong) {
      setError("BIO_INVALID");
      return;
    }
    setError(null);
    sending.current = true;
    setPending(true);
    const result = await onSave(trimmed || null).catch((): Result<void> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setPending(false);
    if (result.ok) {
      setSaved(true);
      onDone();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-bio`} className="text-[15px] font-semibold">
          Descripción
        </label>
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          Opcional. La ve quien pueda abrir tu perfil; en una cuenta privada, solo tus seguidores
          aceptados. Es texto sin formato: los enlaces no se activan.
        </p>
        <textarea
          id={`${id}-bio`}
          value={text}
          rows={4}
          onChange={(event) => {
            setText(event.target.value);
            setSaved(false);
            setError(null);
          }}
          aria-invalid={message ? true : undefined}
          aria-describedby={`${id}-hint ${id}-count${message ? ` ${id}-error` : ""}`}
          className="w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground aria-invalid:border-danger aria-invalid:focus:border-danger"
        />
        <p
          id={`${id}-count`}
          className={`self-end text-[13px] tabular-nums ${tooLong ? "font-semibold text-danger" : "text-muted"}`}
        >
          {count} / {BIO_MAX}
        </p>
        {message && (
          <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
            {message}
          </p>
        )}
      </div>
      {failure && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[failure]}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          Descripción guardada.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-11 self-start action-primary rounded-full px-5 text-sm font-semibold disabled:opacity-50"
      >
        Guardar descripción
      </button>
    </form>
  );
}
