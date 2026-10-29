export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "opinion-theme";
export function parseTheme(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

// Literal estático, sin interpolar datos del visitante. Se ejecuta antes del body.
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem("opinion-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}`;
