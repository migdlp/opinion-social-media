"use client";

import { useSyncExternalStore } from "react";
import { parseTheme, THEME_KEY, type ThemePreference } from "@/lib/theme";

const EVENT = "opinion-theme-change";
let memory: ThemePreference | undefined;
function snapshot(): ThemePreference {
  if (memory !== undefined) return memory;
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}
function apply(theme: ThemePreference) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
function subscribe(notify: () => void) {
  const change = () => notify();
  const storage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_KEY) return;
    memory = undefined;
    apply(snapshot());
    notify();
  };
  window.addEventListener(EVENT, change);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, change);
    window.removeEventListener("storage", storage);
  };
}
function setTheme(theme: ThemePreference) {
  memory = theme;
  apply(theme);
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // La elección sigue activa durante esta visita aunque el navegador no la guarde.
  }
  window.dispatchEvent(new Event(EVENT));
}
const serverSnapshot = (): ThemePreference => "system";

export function ThemeSelector() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <label className="theme-picker relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground">
      <span className="sr-only">Tema</span>
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {theme === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </>
        ) : theme === "dark" ? (
          <path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z" />
        ) : (
          <>
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8m-4-4v4" />
          </>
        )}
      </svg>
      <select
        aria-label="Tema"
        title="Elegir tema: Sistema, Claro u Oscuro"
        value={theme}
        onChange={(event) => setTheme(parseTheme(event.target.value))}
        className="absolute -inset-px h-11 w-11 cursor-pointer opacity-0"
      >
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
  );
}
