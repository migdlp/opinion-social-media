// Comprueba a qué proyecto Supabase apunta el entorno local y que responde.
// Uso: npm run check:env   (lee .env.local)
const PRODUCTION_PROJECT_REF = "qchpdrolulcgmiliysvr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}
if (/^sb_secret_/.test(key) || /service_role/.test(key)) {
  console.error("La clave configurada no es publicable. Usa la Publishable key.");
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];
if (ref === PRODUCTION_PROJECT_REF) {
  console.error(`El entorno local apunta a producción (${ref}). Usa el proyecto de desarrollo.`);
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
console.log(`Proyecto: ${ref} · /auth/v1/health → HTTP ${res.status}`);
process.exit(res.ok ? 0 : 1);
