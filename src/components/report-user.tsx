"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { submitUserReport } from "@/app/report-actions";
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
const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-field px-5 text-sm font-semibold whitespace-nowrap transition-colors hover:border-foreground";

// Acciones distintas de «Denunciar encuesta»: el mensaje de duplicado habla de la persona.
const MESSAGES: Partial<Record<AppErrorCode, string>> = {
  ALREADY_REPORTED: "Ya has denunciado a esta persona.",
};

// Denunciar a una persona desde su perfil (MOD-002). Un visitante va al login y vuelve al perfil;
// con sesión se abre un diálogo modal nativo (<dialog>): atrapa el foco, se cierra con Escape y
// devuelve el foco al botón. Denunciar no bloquea ni oculta nada: lo revisa un moderador.
export function ReportUser({ username, signedIn }: { username: string; signedIn: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<AppErrorCode | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (!open || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    if (done) dialog.current.querySelector("button")?.focus();
  }, [open, done]);

  if (!signedIn) {
    return (
      <Link href={loginPath(`/u/${username}`)} className={BUTTON}>
        Denunciar persona
      </Link>
    );
  }

  function show() {
    setReason(null);
    setDetails("");
    setInvalid(false);
    setDone(false);
    setError(null);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    trigger.current?.focus();
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
    const result = await submitUserReport(username, reason, text || undefined).catch(
      (): { ok: false; error: AppErrorCode } => ({ ok: false, error: "NETWORK_ERROR" }),
    );
    sending.current = false;
    setPending(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  }

  return (
    <>
      <button ref={trigger} type="button" className={BUTTON} onClick={show}>
        Denunciar persona
      </button>
      {open && (
        <dialog
          ref={dialog}
          aria-labelledby={`${id}-title`}
          onClose={onClose}
          className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface p-5 text-foreground backdrop:bg-accent-foreground/65"
        >
          {done ? (
            <div className="flex flex-col gap-4">
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                Denunciar a @{username}
              </h2>
              <p role="status">Gracias, lo revisaremos.</p>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="min-h-11 self-start action-primary rounded-xl px-5 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <h2 id={`${id}-title`} className="text-lg font-semibold">
                Denunciar a @{username}
              </h2>
              <p className="text-sm text-muted">
                Esto denuncia a la persona, no a una encuesta concreta. Un moderador lo revisará;
                denunciar no la bloquea ni cambia su perfil.
              </p>
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
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {MESSAGES[error] ?? ERROR_MESSAGES[error]}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-11 action-primary rounded-xl px-5 text-sm font-semibold"
                >
                  {pending ? "Enviando…" : "Enviar denuncia"}
                </button>
                <button
                  type="button"
                  onClick={() => dialog.current?.close()}
                  className="min-h-11 rounded-xl border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </>
  );
}
