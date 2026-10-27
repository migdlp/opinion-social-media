// Configuración pública de Supabase (docs/entornos.md). Sólo URL y clave publicable:
// el navegador puede verlas. Las claves secretas no se leen nunca desde la app.

const PRODUCTION_PROJECT_REF = "qchpdrolulcgmiliysvr";

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  // Referencias literales para que Next.js las incruste en el bundle del cliente.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local.",
    );
  }

  // Desarrollo local y previews nunca usan la base de producción (docs/arquitectura.md).
  if (
    new URL(url).hostname.startsWith(`${PRODUCTION_PROJECT_REF}.`) &&
    process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"
  ) {
    throw new Error(
      "El proyecto Supabase de producción sólo puede usarse en el despliegue de producción.",
    );
  }

  return { url, publishableKey };
}
