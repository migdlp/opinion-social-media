"use client";

import { useId, useRef, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { AVATAR_ICONS, type AvatarIcon } from "@/lib/avatar-icons";
import type { AppErrorCode, Result } from "@/lib/data/types";
import { Avatar, AvatarGlyph, initialsOf } from "./avatar";

type AvatarPickerProps = {
  username: string;
  displayName: string | null;
  value: AvatarIcon | null;
  onChange: (icon: AvatarIcon | null) => Promise<Result<void>>;
};

const OPTION =
  "relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-foreground has-[:checked]:border-foreground has-[:checked]:bg-track has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2";

// Imagen de perfil (AVATAR-001): iniciales o un icono del catálogo, con vista previa. Se guarda al
// elegir; el control se marca al instante y vuelve a la elección anterior si falla. No toca
// nombre ni @usuario.
export function AvatarPicker({ username, displayName, value, onChange }: AvatarPickerProps) {
  const id = useId();
  const [selected, setSelected] = useState<AvatarIcon | null>(value);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<AppErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);

  async function choose(next: AvatarIcon | null) {
    if (next === selected || sending.current) return;
    sending.current = true;
    const previous = selected;
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
      <div className="flex items-center gap-4">
        <span data-testid="avatar-preview">
          <Avatar username={username} displayName={displayName} size="lg" icon={selected} />
        </span>
        <p id={`${id}-legend`} className="text-[15px] font-semibold">
          Imagen de perfil
        </p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-legend`}
        aria-busy={pending || undefined}
        className="flex flex-wrap gap-2"
      >
        <label className={OPTION}>
          <input
            type="radio"
            name={`${id}-avatar`}
            aria-label="Iniciales"
            checked={selected === null}
            onChange={() => void choose(null)}
            className="sr-only"
          />
          <span aria-hidden="true" className="text-sm font-semibold">
            {initialsOf(username, displayName)}
          </span>
        </label>
        {AVATAR_ICONS.map((icon) => (
          <label key={icon.id} className={OPTION}>
            <input
              type="radio"
              name={`${id}-avatar`}
              aria-label={icon.label}
              checked={selected === icon.id}
              onChange={() => void choose(icon.id)}
              className="sr-only"
            />
            <AvatarGlyph icon={icon.id} className="h-6 w-6" />
          </label>
        ))}
      </div>
      <p className="text-[13px] text-muted">
        Elige un icono o usa tus iniciales. No usamos la foto de tu cuenta de Google.
      </p>
      {saved && (
        <p role="status" className="text-sm font-medium">
          Imagen guardada.
        </p>
      )}
      {failure && (
        <p role="alert" className="text-sm text-danger">
          {ERROR_MESSAGES[failure]} Se mantiene la imagen anterior.
        </p>
      )}
    </div>
  );
}
