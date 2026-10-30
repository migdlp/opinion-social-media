import { AVATAR_ICONS, parseAvatarIcon, type AvatarIcon } from "@/lib/avatar-icons";

// Avatar de iniciales (S-3) o de un icono del catálogo propio (AVATAR-001): sin imágenes externas
// ni foto de Google. El tono sale del @usuario y es uno de los cuatro de la paleta After Sunset
// (DESIGN-004), todos con contraste de texto ≥ 4,5:1 sobre su fondo y distinguibles sobre la
// tarjeta clara y la oscura.

export function initialsOf(username: string, displayName?: string | null): string {
  const name = displayName?.trim();
  if (name) {
    const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
    // Con varias palabras, la inicial de la primera y de la última; con una, sus dos primeras letras.
    const letters =
      words.length > 1
        ? [...words[0]][0] + [...words[words.length - 1]][0]
        : [...(words[0] ?? username)].slice(0, 2).join("");
    return letters.toLocaleUpperCase("es");
  }
  return [...username].slice(0, 2).join("").toLocaleUpperCase("es");
}

const TONES = [
  { background: "#ffb16b", color: "#161e2e" }, // melocotón
  { background: "#b4c8f5", color: "#161e2e" }, // lavanda
  { background: "#161e2e", color: "#ffb16b" }, // azul noche
  { background: "#ffdfc0", color: "#161e2e" }, // melocotón suave
] as const;

export function avatarTone(username: string): { background: string; color: string } {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { ...TONES[hash % TONES.length] };
}

// Trazo del icono (decorativo: el nombre accesible lo da el texto cercano o el selector).
export function AvatarGlyph({ icon, className }: { icon: AvatarIcon; className?: string }) {
  const paths = AVATAR_ICONS.find((item) => item.id === icon)?.paths ?? [];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-3/5 w-3/5"}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const SIZES = { md: "h-11 w-11 text-[15px]", lg: "h-16 w-16 text-xl" } as const;

export function Avatar({
  username,
  displayName,
  size = "md",
  icon,
}: {
  username: string;
  displayName?: string | null;
  size?: keyof typeof SIZES;
  icon?: AvatarIcon | null;
}) {
  const known = parseAvatarIcon(icon);
  if (known) {
    return (
      <span
        aria-hidden="true"
        data-avatar-icon={known}
        style={avatarTone(username)}
        className={`inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-border select-none ${SIZES[size]}`}
      >
        <AvatarGlyph icon={known} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={avatarTone(username)}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ring-1 ring-border select-none ${SIZES[size]}`}
    >
      {initialsOf(username, displayName)}
    </span>
  );
}
