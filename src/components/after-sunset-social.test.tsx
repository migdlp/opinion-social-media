// @vitest-environment jsdom
// DESIGN-004: las pantallas sociales (perfil, listas, solicitudes y ajustes) usan la misma familia
// visual After Sunset que el feed: CTA melocotón (action-primary), tarjetas poll-surface, avatares
// con la paleta de la marca y estados seleccionados cálidos. Sólo se fijan clases, no el comportamiento.
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FollowEntry, ProfileView } from "@/lib/data/types";
import { AccountMenu } from "./account-menu";
import { AvatarPicker } from "./avatar-picker";
import { Avatar, avatarTone } from "./avatar";
import { FollowButton } from "./follow-button";
import { FollowList } from "./follow-list";
import { PrivacyToggle } from "./privacy-toggle";
import { ProfileHeader } from "./profile-header";
import { VoteVisibilityPicker } from "./vote-visibility-picker";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
afterEach(cleanup);

const okNull = async () => ({ ok: true as const, data: null });
const okVoid = async () => ({ ok: true as const, data: undefined });
const PROFILE: ProfileView = {
  username: "perfil_b",
  displayName: "Beto",
  isPrivate: false,
  followersCount: 3,
  followingCount: 1,
  pollsCount: 5,
  viewerRelation: "none",
  canViewContent: true,
};
const entry: FollowEntry = { username: "ana_23", displayName: "Ana" };

// Contraste WCAG 2.x entre dos colores #rrggbb.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("DESIGN-004: avatares con la paleta After Sunset", () => {
  const users = ["a", "bb", "ccc", "ana_23", "beto", "carla", "dani", "eva", "fran", "moderacion"];

  it("el tono es estable y hay variedad entre usuarios", () => {
    expect(avatarTone("ana_23")).toEqual(avatarTone("ana_23"));
    expect(new Set(users.map((u) => avatarTone(u).background)).size).toBeGreaterThan(2);
  });

  it("usa colores de la marca (nunca grises) y deja contraste de texto de al menos 4,5:1", () => {
    for (const u of users) {
      const { background, color } = avatarTone(u);
      expect(background).toMatch(/^#[0-9a-f]{6}$/);
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b), `${u} no es un gris`).toBeGreaterThan(20);
      expect(contrast(background, color), u).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("el avatar de la cabecera usa el mismo tono que el del perfil", () => {
    const { container } = render(
      <>
        <Avatar username="ana" />
        <AccountMenu username="ana" />
      </>,
    );
    const profile = container.querySelector("span[aria-hidden]") as HTMLElement;
    const menu = screen.getByLabelText("Menú de cuenta").querySelector("span") as HTMLElement;
    expect(menu.style.backgroundColor).toBe(profile.style.backgroundColor);
    expect(menu.style.color).toBe(profile.style.color);
    // Con tono azul noche sobre la cabecera oscura el círculo se perdería: lleva un anillo de borde.
    expect(profile.className).toContain("ring-border");
    expect(menu.className).toContain("ring-border");
  });
});

describe("DESIGN-004: botones primarios en melocotón", () => {
  it.each([
    ["con sesión (botón)", true, "button"],
    ["visitante (enlace al login)", false, "link"],
  ] as const)("«Seguir» %s usa action-primary y no el fondo oscuro", (_name, signedIn, role) => {
    render(
      <FollowButton
        username="perfil_b"
        relation="none"
        signedIn={signedIn}
        onFollow={vi.fn()}
        onUnfollow={vi.fn()}
      />,
    );
    const seguir = screen.getByRole(role, { name: "Seguir" });
    expect(seguir.className).toContain("action-primary");
    expect(seguir.className).not.toContain("bg-foreground");
  });

  it("«Aceptar» en las solicitudes usa action-primary y no el fondo oscuro", () => {
    render(
      <FollowList
        initialUsers={[entry]}
        initialCursor={null}
        loadMore={vi.fn()}
        emptyText="Nadie"
        onRespond={vi.fn(okVoid)}
      />,
    );
    const accept = screen.getByRole("button", { name: /^Aceptar/ });
    expect(accept.className).toContain("action-primary");
    expect(accept.className).not.toContain("bg-foreground");
  });

  it("confirmar «Hacer privada» usa action-primary", async () => {
    render(<PrivacyToggle isPrivate={false} onChange={vi.fn(okNull)} />);
    await userEvent.click(screen.getByRole("switch", { name: "Cuenta privada" }));
    const confirm = screen.getByRole("button", { name: "Hacer privada" });
    expect(confirm.className).toContain("action-primary");
    expect(confirm.className).not.toContain("bg-foreground");
  });

  it("el interruptor de privacidad activo se pinta en melocotón, no en negro", () => {
    render(<PrivacyToggle isPrivate onChange={vi.fn(okNull)} />);
    const toggle = screen.getByRole("switch", { name: "Cuenta privada" });
    expect(toggle.className).toContain("aria-checked:bg-accent");
    expect(toggle.className).not.toContain("aria-checked:bg-foreground");
  });
});

describe("DESIGN-004: tarjetas de la familia poll-surface", () => {
  it("la cabecera del perfil usa poll-surface", () => {
    render(<ProfileHeader profile={PROFILE} signedIn onFollow={vi.fn()} onUnfollow={vi.fn()} />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("poll-surface");
    expect(header.className).not.toContain("rounded-2xl");
  });

  it("el contador de solicitudes pendientes del perfil propio va en melocotón", () => {
    render(
      <ProfileHeader
        profile={{ ...PROFILE, viewerRelation: "self" }}
        pendingRequests={7}
        signedIn
        onFollow={vi.fn()}
        onUnfollow={vi.fn()}
      />,
    );
    const badge = screen.getByText("7");
    expect(badge.className).toContain("bg-accent");
    expect(badge.className).not.toContain("bg-foreground");
  });

  it("cada persona de una lista es una tarjeta poll-surface", () => {
    const { container } = render(
      <FollowList
        initialUsers={[entry]}
        initialCursor={null}
        loadMore={vi.fn()}
        emptyText="Nadie"
      />,
    );
    expect(container.querySelector("li")!.className).toContain("poll-surface");
  });

  it("el estado vacío de una lista también", () => {
    const { container } = render(
      <FollowList initialUsers={[]} initialCursor={null} loadMore={vi.fn()} emptyText="Nadie" />,
    );
    expect(container.querySelector(".poll-surface")).not.toBeNull();
  });
});

describe("DESIGN-004: selección cálida en los selectores de Ajustes", () => {
  it("la visibilidad de votos marca la opción elegida con el baño melocotón", () => {
    const { container } = render(<VoteVisibilityPicker value="private" onChange={vi.fn(okVoid)} />);
    const rows = [...container.querySelectorAll("label")];
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(row.className).toContain("has-[:checked]:border-(--option-selected-border)");
      expect(row.className).not.toContain("has-[:checked]:border-foreground");
    }
  });

  it("el selector de icono marca el elegido con la misma selección", () => {
    const { container } = render(
      <AvatarPicker username="ana_23" displayName="Ana" value="sol" onChange={vi.fn(okVoid)} />,
    );
    const options = [...container.querySelectorAll("label")];
    expect(options.length).toBeGreaterThan(1);
    for (const option of options) {
      expect(option.className).toContain("has-[:checked]:border-(--option-selected-border)");
      expect(option.className).not.toContain("has-[:checked]:border-foreground");
    }
  });
});
