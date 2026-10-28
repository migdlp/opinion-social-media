"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { submitReport } from "@/app/report-actions";
import { loginPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { ReportReason } from "@/lib/data/operations";
import type { AppErrorCode } from "@/lib/data/types";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "odio", label: "Odio o discriminación" },
  { value: "acoso", label: "Acoso" },
  { value: "sexual", label: "Contenido sexual" },
  { value: "violencia", label: "Violencia" },
  { value: "otro", label: "Otro" },
];

const DETAILS_MAX = 500;

const menuItemClass =
  "block w-full min-h-11 px-4 py-2.5 text-left text-sm font-medium hover:bg-track focus-visible:bg-track";

// Menú «⋯» de una encuesta con «Denunciar» (V2-020). Un visitante va al login y vuelve a la
// encuesta; con sesión se abre un diálogo modal nativo (<dialog>): atrapa el foco, se cierra con
// Escape y devuelve el foco al botón del menú. Denunciar no oculta nada: lo revisa un moderador.
export function ReportPoll({ pollId, signedIn }: { pollId: string; signedIn: boolean }) {
  const id = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (!dialogOpen || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    // El formulario desaparece al confirmar: llevar el foco al único control restante.
    if (done) dialog.current.querySelector("button")?.focus();
  }, [dialogOpen, done]);

  // El menú se cierra al pulsar fuera de él.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    trigger.current?.focus();
  }

  function openDialog() {
    setMenuOpen(false);
    setReason(null);
    setDetails("");
    setInvalid(false);
    setDone(false);
    setError(null);
    setDialogOpen(true);
  }

  function onClose() {
    setDialogOpen(false);
    trigger.current?.focus();
  }

  // Completa el modal nativo: Tab desde el último control no debe perder el foco
  // hacia el chrome del navegador. El grupo de motivos aporta una sola parada.
  function keepDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), a[href]',
      ),
    ).filter((element) => element.tabIndex >= 0 && !element.hidden);
    const stops = controls.filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== "radio") return true;
      const group = controls.filter(
        (candidate): candidate is HTMLInputElement =>
          candidate instanceof HTMLInputElement &&
          candidate.type === "radio" &&
          candidate.name === element.name,
      );
      return element === (group.find((radio) => radio.checked) ?? group[0]);
    });
    const first = stops[0];
    const last = stops.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    if (!reason) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setError(null);
    sending.current = true;
    setPending(true);
    const text = details.trim();
    const result = await submitReport(pollId, reason, text || undefined).catch(
      (): { ok: false; error: AppErrorCode } => ({ ok: false, error: "NETWORK_ERROR" }),
    );
    sending.current = false;
    setPending(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  }

  const loginHref = loginPath(`/polls/${pollId}`);

  return (
    <div ref={root} className="relative z-10">
      <button
        ref={trigger}
        type="button"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        onKeyDown={(event) => event.key === "Escape" && menuOpen && closeMenu()}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl leading-none text-muted transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {menuOpen && (
        <div
          role="menu"
          onKeyDown={(event) => event.key === "Escape" && closeMenu()}
          className="absolute right-0 z-20 mt-1 min-w-44 overflow-hidden rounded-xl border border-border bg-surface"
        >
          {signedIn ? (
            <button
              type="button"
              role="menuitem"
              onClick={openDialog}
              autoFocus
              className={menuItemClass}
            >
              Denunciar
            </button>
          ) : (
            <Link role="menuitem" href={loginHref} autoFocus className={menuItemClass}>
              Denunciar
            </Link>
          )}
        </div>
      )}
      {dialogOpen && (
        <dialog
          ref={dialog}
          aria-labelledby={`${id}-title`}
          onClose={onClose}
          onKeyDown={keepDialogFocus}
          className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface p-5 text-foreground backdrop:bg-accent-foreground/65"
        >
          {done ? (
            <div className="flex flex-col gap-4">
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                Denunciar encuesta
              </h2>
              <p role="status">Gracias, lo revisaremos.</p>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="min-h-11 self-start action-primary rounded-full px-5 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                Denunciar encuesta
              </h2>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-[15px] font-semibold">Motivo</legend>
                {REASONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]"
                  >
                    <input
                      type="radio"
                      name={`${id}-reason`}
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => setReason(option.value)}
                      aria-describedby={invalid ? `${id}-reason-error` : undefined}
                    />
                    {option.label}
                  </label>
                ))}
                {invalid && (
                  <p id={`${id}-reason-error`} className="text-[13px] font-medium text-danger">
                    Elige un motivo.
                  </p>
                )}
              </fieldset>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-details`} className="text-[15px] font-semibold">
                  Detalles (opcional)
                </label>
                <textarea
                  id={`${id}-details`}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  maxLength={DETAILS_MAX}
                  rows={3}
                  className="w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] focus:border-foreground"
                />
              </div>
              {error === "AUTH_REQUIRED" ? (
                <p className="rounded-xl border border-border bg-surface p-3 text-sm">
                  Inicia sesión para denunciar.{" "}
                  <Link href={loginHref} className="font-semibold underline">
                    Iniciar sesión
                  </Link>
                </p>
              ) : (
                error && (
                  <p role="alert" className="text-sm text-danger">
                    {ERROR_MESSAGES[error]}
                  </p>
                )
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 action-primary rounded-full px-5 text-sm font-semibold"
                >
                  {pending ? "Enviando…" : "Enviar denuncia"}
                </button>
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="min-h-11 rounded-full border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </div>
  );
}
