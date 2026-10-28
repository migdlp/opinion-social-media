// Avatar de iniciales (S-3): sin imágenes ni foto de Google. El tono sale del @usuario, en una
// escala de grises acorde con el diseño en blanco y negro (texto blanco: contraste ≥ 4,5:1).

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

export function avatarTone(username: string): { background: string; color: string } {
  let hash = 0;
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const lightness = 18 + (hash % 25); // 18–42 %
  return { background: `hsl(0 0% ${lightness}%)`, color: "#ffffff" };
}

const SIZES = { md: "h-11 w-11 text-[15px]", lg: "h-16 w-16 text-xl" } as const;

export function Avatar({
  username,
  displayName,
  size = "md",
}: {
  username: string;
  displayName?: string | null;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden="true"
      style={avatarTone(username)}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide select-none ${SIZES[size]}`}
    >
      {initialsOf(username, displayName)}
    </span>
  );
}
