"use client";

import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Profile, Result } from "@/lib/data/types";
import { normalizeText } from "@/lib/utils/text";
import { hasProfileErrors, validateProfileInput } from "@/lib/validation/profile";

type ProfileFormProps = {
  onSubmit: (username: string, displayName: string | null) => Promise<Result<Profile>>;
  // Tras guardar con éxito (el llamador navega al destino).
  onDone: () => void;
  // Edición desde /settings (V2-008): parte de los valores actuales, avisa al cambiar el
  // @usuario y, tras guardar, sigue editable.
  initial?: { username: string; displayName: string | null };
};

const fieldClass =
  "w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground focus:outline-none aria-invalid:border-danger";

// Elegir @usuario (obligatorio) y nombre visible (opcional) tras el primer login (V2-002).
// Valida en cliente al enviar con las mismas reglas que la base de datos; la disponibilidad
// la decide el servidor al guardar («Ese nombre ya está en uso.») y los campos se conservan.
export function ProfileForm({ onSubmit, onDone, initial }: ProfileFormProps) {
  const id = useId();
  const [username, setUsername] = useState(initial?.username ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; displayName?: string }>({});
  const [failure, setFailure] = useState<AppErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    const errors = validateProfileInput(username, displayName);
    setFieldErrors(errors);
    if (hasProfileErrors(errors)) return;
    setFailure(null);
    setSaved(false);
    sending.current = true;
    setPending(true);
    const name = normalizeText(displayName);
    const result = await onSubmit(username.toLowerCase(), name || null).catch(
      (): Result<Profile> => ({ ok: false, error: "NETWORK_ERROR" }),
    );
    if (result.ok && initial) {
      sending.current = false;
      setPending(false);
      setSaved(true);
      onDone();
      return;
    }
    if (result.ok) {
      // Se mantiene bloqueado: la navegación al destino está en curso.
      onDone();
      return;
    }
    sending.current = false;
    setPending(false);
    if (result.error === "USERNAME_TAKEN" || result.error === "USERNAME_RESERVED") {
      setFieldErrors({ username: ERROR_MESSAGES[result.error] });
    } else if (result.error === "USERNAME_INVALID") {
      setFieldErrors({ username: ERROR_MESSAGES.USERNAME_INVALID });
    } else if (result.error === "DISPLAY_NAME_INVALID") {
      setFieldErrors({ displayName: ERROR_MESSAGES.DISPLAY_NAME_INVALID });
    } else {
      setFailure(result.error);
    }
  }

  const usernameError = fieldErrors.username;
  const nameError = fieldErrors.displayName;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-username`} className="text-[15px] font-semibold">
          Usuario
        </label>
        <input
          id={`${id}-username`}
          type="text"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setSaved(false);
          }}
          autoCapitalize="none"
          autoComplete="username"
          spellCheck={false}
          aria-invalid={usernameError ? true : undefined}
          aria-describedby={`${id}-username-hint${usernameError ? ` ${id}-username-error` : ""}`}
          className={fieldClass}
        />
        <p id={`${id}-username-hint`} className="text-[13px] text-muted">
          Así te verán los demás:{" "}
          <span className="font-semibold text-foreground">@{username.toLowerCase() || "…"}</span>
        </p>
        {initial && username.toLowerCase() !== initial.username && (
          <p className="text-[13px] text-muted">
            Si cambias tu @usuario, los enlaces antiguos a tu perfil dejarán de funcionar.
          </p>
        )}
        {usernameError && (
          <p id={`${id}-username-error`} className="text-[13px] font-medium text-danger">
            {usernameError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-name`} className="text-[15px] font-semibold">
          Nombre visible (opcional)
        </label>
        <input
          id={`${id}-name`}
          type="text"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setSaved(false);
          }}
          autoComplete="nickname"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          className={fieldClass}
        />
        {nameError && (
          <p id={`${id}-name-error`} className="text-[13px] font-medium text-danger">
            {nameError}
          </p>
        )}
      </div>

      {failure && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[failure]}
        </p>
      )}

      {saved && (
        <p role="status" className="text-sm font-medium">
          Cambios guardados.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-start rounded-full bg-foreground px-6 font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
