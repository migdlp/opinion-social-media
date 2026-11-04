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
    return "light";
  }
}
function apply(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
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
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // La elección sigue activa durante esta visita aunque el navegador no la guarde.
  }
  window.dispatchEvent(new Event(EVENT));
}
const serverSnapshot = (): ThemePreference => "light";

export function ThemeSelector() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const action = theme === "light" ? "Activar modo oscuro" : "Activar modo claro";
  return (
    <button
      type="button"
      aria-label={action}
      title={action}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="theme-picker inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground cursor-pointer transition-colors hover:border-field"
    >
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
        ) : (
          <path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z" />
        )}
      </svg>
    </button>
  );
}
