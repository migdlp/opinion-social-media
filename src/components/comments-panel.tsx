"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  loadMoreComments,
  postComment,
  submitCommentReport,
  toggleComments,
} from "@/app/polls/[id]/comment-actions";
import { loginPath } from "@/lib/auth/redirect";
import type { CommentPage } from "@/lib/data/types";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { CommentsToggle } from "./comments-toggle";
import { VOTED_EVENT } from "./poll-voting";

type CommentsPanelProps = {
  pollId: string;
  enabled: boolean;
  isAuthor: boolean;
  signedIn: boolean;
  // Debate disponible para quien mira (activo y, si la encuesta está abierta, con voto previo).
  initial: CommentPage | null;
  // Abierta y sin voto: sólo se explica cómo acceder; no se pide ni se recibe ningún comentario.
  locked: boolean;
};

// Debate bajo el detalle de una encuesta (CMT-002). Tras publicar, activar/apagar o votar se refresca
// la página para traer el estado real desde el servidor.
export function CommentsPanel({
  pollId,
  enabled,
  isAuthor,
  signedIn,
  initial,
  locked,
}: CommentsPanelProps) {
  const router = useRouter();
  const refresh = () => router.refresh();
  // Al votar en esta misma encuesta se abre el debate: se pide al servidor el estado real.
  useEffect(() => {
    const onVoted = (event: Event) => {
      if ((event as CustomEvent<{ pollId: string }>).detail?.pollId === pollId) router.refresh();
    };
    window.addEventListener(VOTED_EVENT, onVoted);
    return () => window.removeEventListener(VOTED_EVENT, onVoted);
  }, [pollId, router]);
  return (
    <section
      aria-labelledby="comentarios-titulo"
      className="mx-auto flex w-full max-w-content flex-col gap-4 py-4"
    >
      <h2 id="comentarios-titulo" className="text-lg font-semibold tracking-[-0.02em]">
        Comentarios
      </h2>
      {isAuthor && (
        <CommentsToggle
          pollId={pollId}
          enabled={enabled}
          setComments={toggleComments}
          onChanged={refresh}
        />
      )}
      {enabled && locked && (
        <p className="text-sm text-muted">
          Vota para ver y escribir comentarios. Mientras la encuesta esté abierta, el debate es sólo
          para quien ya ha votado.
        </p>
      )}
      {enabled && !locked && initial && (
        <>
          <p className="text-[13px] text-muted">
            Ocultar tu historial de votos no oculta los comentarios que publiques voluntariamente, y
            publicar no revela qué has votado.
          </p>
          {signedIn ? (
            <CommentForm pollId={pollId} post={postComment} onPosted={refresh} />
          ) : (
            <Link
              href={loginPath(`/polls/${pollId}`)}
              className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
            >
              Inicia sesión para comentar
            </Link>
          )}
          <CommentList
            key={`${initial.items[0]?.id ?? "vacio"}:${initial.items.length}`}
            pollId={pollId}
            initial={initial}
            loadMore={loadMoreComments}
            report={submitCommentReport}
            signedIn={signedIn}
          />
        </>
      )}
    </section>
  );
}
