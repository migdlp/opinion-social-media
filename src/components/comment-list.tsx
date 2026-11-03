"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { ReportReason } from "@/lib/data/operations";
import type { AppErrorCode, CommentPage, PollComment, Result } from "@/lib/data/types";
import { formatApproximateDate } from "@/lib/utils/date";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "odio", label: "Odio o discriminación" },
  { value: "acoso", label: "Acoso" },
  { value: "sexual", label: "Contenido sexual" },
  { value: "violencia", label: "Violencia" },
  { value: "otro", label: "Otro" },
];

type CommentListProps = {
  pollId: string;
  initial: CommentPage;
  loadMore: (pollId: string, cursor: string) => Promise<Result<CommentPage>>;
  report: (commentId: string, reason: ReportReason, details?: string) => Promise<Result<void>>;
  signedIn: boolean;
  now?: Date;
};

// Lista plana de comentarios (CMT-002), de más reciente a más antiguo: sin hilos ni likes. El texto
// se muestra siempre como texto (React lo escapa). «Cargar más» añade la página siguiente sin
// duplicados; un error conserva lo ya cargado. Con sesión, cada comentario se puede denunciar.
export function CommentList({
  pollId,
  initial,
  loadMore,
  report,
  signedIn,
  now = new Date(),
}: CommentListProps) {
  const [items, setItems] = useState<PollComment[]>(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const seen = useRef(new Set(initial.items.map((item) => item.id)));

  async function more() {
    if (!cursor || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    const page = await loadMore(pollId, cursor).catch((): Result<CommentPage> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    busy.current = false;
    setPending(false);
    if (!page.ok) {
      setError(ERROR_MESSAGES[page.error]);
      return;
    }
    const fresh = page.data.items.filter((item) => !seen.current.has(item.id));
    fresh.forEach((item) => seen.current.add(item.id));
    setItems((previous) => [...previous, ...fresh]);
    setCursor(page.data.nextCursor);
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay comentarios. Escribe el primero.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="Comentarios" className="flex flex-col gap-3">
        {items.map((comment) => (
          <li key={comment.id} className="flex flex-col gap-1 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-muted">
              {comment.displayName && (
                <span className="font-medium text-foreground">{comment.displayName}</span>
              )}
              <Link href={`/u/${comment.username}`} className="underline-offset-4 hover:underline">
                @{comment.username}
              </Link>
              <time dateTime={comment.createdAt}>
                {formatApproximateDate(comment.createdAt, now)}
              </time>
            </div>
            <p className="text-[15px] break-words whitespace-pre-wrap">{comment.body}</p>
            {signedIn && <ReportComment commentId={comment.id} report={report} />}
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {cursor && (
        <button
          type="button"
          onClick={() => void more()}
          disabled={pending}
          className="min-h-11 self-start rounded-full border border-field bg-surface px-5 text-sm font-semibold hover:border-foreground disabled:cursor-wait"
        >
          {pending ? "Cargando…" : "Cargar más comentarios"}
        </button>
      )}
    </div>
  );
}

function ReportComment({
  commentId,
  report,
}: {
  commentId: string;
  report: CommentListProps["report"];
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!reason) {
      setError("Elige un motivo para la denuncia.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    const result = await report(
      commentId,
      reason as ReportReason,
      details.trim() || undefined,
    ).catch((): Result<void> => ({ ok: false, error: "NETWORK_ERROR" }));
    busy.current = false;
    setPending(false);
    if (result.ok) setDone(true);
    else setError(reportMessage(result.error));
  }

  return (
    <details className="text-[13px]">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted hover:text-foreground">
        Denunciar
      </summary>
      {done ? (
        <p role="status" className="py-2">
          Gracias, hemos recibido tu denuncia. No oculta nada por sí sola: la revisa una persona.
        </p>
      ) : (
        <form onSubmit={send} noValidate className="flex flex-col gap-2 py-2">
          <label htmlFor={`${id}-reason`} className="font-semibold">
            Motivo
          </label>
          <select
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-11 rounded-xl border border-field bg-surface px-3"
          >
            <option value="">Elige un motivo</option>
            {REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-details`} className="font-semibold">
            Detalle (opcional)
          </label>
          <textarea
            id={`${id}-details`}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={500}
            rows={2}
            className="rounded-xl border border-field bg-surface px-3 py-2"
          />
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 self-start rounded-full border border-field bg-surface px-4 font-semibold hover:border-foreground"
          >
            {pending ? "Enviando…" : "Enviar denuncia"}
          </button>
        </form>
      )}
    </details>
  );
}

function reportMessage(code: AppErrorCode): string {
  if (code === "ALREADY_REPORTED") return "Ya habías denunciado este comentario.";
  return ERROR_MESSAGES[code];
}
