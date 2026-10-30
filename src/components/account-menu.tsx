"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { signOut } from "@/app/auth/actions";
import { NavigationIcon } from "./navigation-icon";

const ITEM = "block min-h-11 rounded-lg px-3 py-2.5 text-sm hover:bg-track focus-visible:bg-track";

export function AccountMenu({ username }: { username: string | null }) {
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const menu = root.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Dos superficies de la paleta, elegidas de forma estable a partir de @usuario.
  // El avatar no publica el nombre, email ni la foto proporcionados por Google.
  const darkAvatar = username
    ? Array.from(username).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0
    : false;
  return (
    <details
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onClick={(event) => {
        if ((event.target as Element).closest("a")) event.currentTarget.open = false;
      }}
      onSubmit={(event) => {
        event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label="Menú de cuenta"
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full font-semibold marker:hidden"
      >
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center rounded-full text-sm ${darkAvatar ? "bg-foreground text-background" : "bg-track text-foreground"}`}
        >
          {username ? username.slice(0, 2).toUpperCase() : <NavigationIcon name="profile" />}
        </span>
        {username && <span className="hidden text-sm sm:inline">@{username}</span>}
      </summary>
      <nav
        aria-label="Cuenta"
        className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-field bg-surface p-2 text-foreground"
      >
        <Link href="/me" className={ITEM}>
          Mi perfil
        </Link>
        <Link href="/settings" className={ITEM}>
          Ajustes
        </Link>
        <Link href="/solicitudes" className={ITEM}>
          Solicitudes
        </Link>
        <form action={signOut}>
          <button type="submit" className={`${ITEM} w-full text-left`}>
            Cerrar sesión
          </button>
        </form>
      </nav>
    </details>
  );
}
