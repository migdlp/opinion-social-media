import { USERNAME_PATTERN } from "@/lib/validation/profile";

const APP_NAME = "Opinión";

// Título de pestaña de una página: «<página> · Opinión». La portada conserva «Opinión» a secas.
export function pageTitle(name: string): string {
  return `${name} · ${APP_NAME}`;
}

// Título de /u/<usuario> y sus listas. Sólo repite el @usuario de la URL (público para cualquier
// visitante), sin consultar datos: una cuenta privada, oculta o inexistente da el mismo título, así
// que la pestaña nunca revela más que la propia dirección. Un nombre que no puede existir recibe el
// título genérico en lugar de repetir texto arbitrario de la URL.
export function profileTitle(username: string, prefix = ""): string {
  const name = username.toLowerCase();
  return USERNAME_PATTERN.test(name) ? pageTitle(`${prefix}@${name}`) : pageTitle("No disponible");
}
