// Catálogo cerrado de iconos de perfil (AVATAR-001). Dibujos propios de este proyecto (trazos
// simples sobre una malla de 24×24, sin dependencias ni imágenes externas); procedencia y licencia
// en docs/avatares.md. Los identificadores son los mismos que admite la base de datos
// (`profiles.avatar_icon`); un test comprueba que no se desincronizan.
export type AvatarIcon =
  "sol" | "luna" | "estrella" | "hoja" | "ola" | "montana" | "nube" | "llama";

export const AVATAR_ICONS: readonly { id: AvatarIcon; label: string; paths: readonly string[] }[] =
  [
    {
      id: "sol",
      label: "Sol",
      paths: [
        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
        "M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
      ],
    },
    { id: "luna", label: "Luna", paths: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"] },
    {
      id: "estrella",
      label: "Estrella",
      paths: ["M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"],
    },
    { id: "hoja", label: "Hoja", paths: ["M20 4C9 4 4 10 4 20c10 0 16-5 16-16Z", "M4 20 14 10"] },
    {
      id: "ola",
      label: "Ola",
      paths: [
        "M2 10c2.5-3 4.5-3 7 0s4.5 3 7 0 3.5-2.2 6-.4",
        "M2 17c2.5-3 4.5-3 7 0s4.5 3 7 0 3.5-2.2 6-.4",
      ],
    },
    { id: "montana", label: "Montaña", paths: ["M2 20 9 7l4 7 3-4 6 10H2Z"] },
    {
      id: "nube",
      label: "Nube",
      paths: ["M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9.5 4.25 4.25 0 0 1 17.5 18H7Z"],
    },
    {
      id: "llama",
      label: "Llama",
      paths: ["M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4.5 3-6 .5 2 1.5 2.5 2 3 0-3-.5-5 1-9Z"],
    },
  ];

export function isAvatarIcon(value: unknown): value is AvatarIcon {
  return AVATAR_ICONS.some((icon) => icon.id === value);
}

// Un valor desconocido (por ejemplo, de una versión futura) se trata como «sin icono».
export function parseAvatarIcon(value: unknown): AvatarIcon | null {
  return isAvatarIcon(value) ? value : null;
}
