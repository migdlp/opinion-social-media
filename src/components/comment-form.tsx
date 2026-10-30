"use client";

import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";

const MAX = 1000;

type CommentFormProps = {
  pollId: string;
  post: (pollId: string, body: string) => Promise<Result<{ id: string }>>;
  // Tras publicar (o no saber si se publicó) el detalle refresca la lista.
  onPosted: () => void;
};

// Formulario de comentario (CMT-002). Un solo envío a la vez; si falla, el texto se conserva. Tras
// una caída de red no se sabe si se publicó: se refresca la lista y se pide revisarla antes de
// reintentar, para no duplicar.
export function CommentForm({ pollId, post, onPosted }: CommentFormProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const body = text.trim();
    if (!body) {
      setError("Escribe algo antes de publicar.");
      return;
    }
    sending.current = true;
    setPending(true);
    setError(null);
    const result = await post(pollId, body).catch((): Result<{ id: string }> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    sending.current = false;
    setPending(false);
    if (result.ok) {
      setText("");
      onPosted();
      return;
    }
    if (result.error === "NETWORK_ERROR") {
      setError(
        "No hemos podido confirmar si se publicó. Revisa los comentarios antes de volver a enviarlo.",
      );
      onPosted();
      return;
    }
    setError(messageFor(result.error));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={`${id}-text`} className="text-[15px] font-semibold">
        Escribe un comentario
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        maxLength={MAX}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        className="w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground aria-invalid:border-danger"
      />
      <p id={`${id}-help`} className="text-[13px] text-muted">
        Tu @usuario será visible junto a tu comentario. Publicar no revela tu voto. {text.length}/
        {MAX}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="action-primary min-h-11 self-start rounded-xl px-5 text-sm font-semibold"
      >
        {pending ? "Publicando…" : "Publicar comentario"}
      </button>
    </form>
  );
}

function messageFor(code: AppErrorCode): string {
  if (code === "RATE_LIMITED")
    return "Has publicado demasiados comentarios seguidos. Espera un minuto.";
  return ERROR_MESSAGES[code];
}
