export type ThemePreference = "light" | "dark";
export const THEME_KEY = "opinion-theme";
export function parseTheme(value: string | null): ThemePreference {
  return value === "dark" ? "dark" : "light";
}

// Literal estático, sin interpolar datos del visitante. Se ejecuta antes del body.
export const THEME_BOOTSTRAP = `(()=>{let t="light";try{if(localStorage.getItem("opinion-theme")==="dark")t="dark"}catch{}document.documentElement.dataset.theme=t})()`;
