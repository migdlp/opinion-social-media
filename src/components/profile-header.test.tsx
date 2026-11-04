// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileView } from "@/lib/data/types";
import { ProfileHeader } from "./profile-header";

vi.mock("@/app/report-actions", () => ({ submitUserReport: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(cleanup);

const PROFILE: ProfileView = {
  username: "perfil_b",
  displayName: "Beto",
  isPrivate: false,
  followersCount: 1234,
  followingCount: 1,
  pollsCount: 5,
  viewerRelation: "none",
  canViewContent: true,
};
const props = { signedIn: true, onFollow: vi.fn(), onUnfollow: vi.fn() };

describe("ProfileHeader", () => {
  it("muestra avatar, nombre visible, @usuario y contadores con sus enlaces", () => {
    render(<ProfileHeader profile={PROFILE} {...props} />);

    expect(screen.getByRole("heading", { level: 1, name: "Beto" })).toBeDefined();
    expect(screen.getByText("@perfil_b")).toBeDefined();
    expect(screen.getByText("BE")).toBeDefined();
    const followers = screen.getByRole("link", { name: /seguidores/ });
    expect(followers.getAttribute("href")).toBe("/u/perfil_b/seguidores");
    expect(within(followers).getByText("1.234")).toBeDefined();
    expect(screen.getByRole("link", { name: /siguiendo/ }).getAttribute("href")).toBe(
      "/u/perfil_b/siguiendo",
    );
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("encuestas")).toBeDefined();
  });

  it("sin nombre visible el título es el @usuario", () => {
    render(<ProfileHeader profile={{ ...PROFILE, displayName: null }} {...props} />);
    expect(screen.getByRole("heading", { level: 1, name: "@perfil_b" })).toBeDefined();
  });

  it("singular en una sola encuesta y marca de cuenta privada", () => {
    render(<ProfileHeader profile={{ ...PROFILE, pollsCount: 1, isPrivate: true }} {...props} />);
    expect(screen.getByText("encuesta")).toBeDefined();
    expect(screen.getByText("Cuenta privada")).toBeDefined();
  });

  it("incluye el botón de seguir según la relación", () => {
    render(<ProfileHeader profile={{ ...PROFILE, viewerRelation: "self" }} {...props} />);
    expect(screen.getByRole("link", { name: "Editar perfil" })).toBeDefined();
  });

  it("en el perfil propio con solicitudes pendientes enlaza a la bandeja con el número", () => {
    render(
      <ProfileHeader
        profile={{ ...PROFILE, viewerRelation: "self" }}
        pendingRequests={3}
        {...props}
      />,
    );
    const link = screen.getByRole("link", { name: "Solicitudes de seguimiento: 3 pendientes" });
    expect(link.getAttribute("href")).toBe("/solicitudes");
  });

  it("sin solicitudes pendientes el propio perfil enlaza a la bandeja sin indicador", () => {
    render(
      <ProfileHeader
        profile={{ ...PROFILE, viewerRelation: "self" }}
        pendingRequests={0}
        {...props}
      />,
    );
    expect(screen.getByRole("link", { name: "Solicitudes de seguimiento" })).toBeDefined();
  });

  it("en el perfil de otra persona nunca aparece la bandeja", () => {
    render(<ProfileHeader profile={PROFILE} pendingRequests={5} {...props} />);
    expect(screen.queryByRole("link", { name: /Solicitudes/ })).toBeNull();
  });

  it("AVATAR-001: muestra el icono elegido o las iniciales", () => {
    const { container, rerender } = render(
      <ProfileHeader profile={{ ...PROFILE, avatarIcon: "hoja" }} {...props} />,
    );
    expect(container.querySelector('[data-avatar-icon="hoja"]')).not.toBeNull();
    rerender(<ProfileHeader profile={PROFILE} {...props} />);
    expect(container.querySelector("[data-avatar-icon]")).toBeNull();
    expect(screen.getByText("BE")).toBeDefined();
  });
});

describe("ProfileHeader: bloquear (SOCIAL-002)", () => {
  const onBlock = vi.fn();

  it.each(["none", "pending", "following"] as const)(
    "con sesión y relación %s ofrece Bloquear",
    (viewerRelation) => {
      render(
        <ProfileHeader profile={{ ...PROFILE, viewerRelation }} {...props} onBlock={onBlock} />,
      );
      expect(screen.getByRole("button", { name: "Bloquear" })).toBeDefined();
    },
  );

  it("no se ofrece sobre uno mismo, sin sesión ni sin acción de bloqueo", () => {
    const { rerender } = render(
      <ProfileHeader
        profile={{ ...PROFILE, viewerRelation: "self" }}
        {...props}
        onBlock={onBlock}
      />,
    );
    expect(screen.queryByRole("button", { name: "Bloquear" })).toBeNull();
    rerender(<ProfileHeader profile={PROFILE} {...props} signedIn={false} onBlock={onBlock} />);
    expect(screen.queryByRole("button", { name: "Bloquear" })).toBeNull();
    rerender(<ProfileHeader profile={PROFILE} {...props} />);
    expect(screen.queryByRole("button", { name: "Bloquear" })).toBeNull();
  });
});

describe("ProfileHeader: descripción (PROFILE-002)", () => {
  it("muestra la descripción como texto: conserva saltos y no interpreta HTML ni enlaces", () => {
    render(
      <ProfileHeader
        profile={{ ...PROFILE, bio: "Línea 1\n<b>negrita</b> https://x.test" }}
        {...props}
      />,
    );
    const bio = screen.getByText(/Línea 1/);
    expect(bio.textContent).toBe("Línea 1\n<b>negrita</b> https://x.test");
    expect(bio.querySelector("b")).toBeNull();
    expect(bio.querySelector("a")).toBeNull();
    expect(bio.className).toMatch(/whitespace-pre-wrap/);
    expect(bio.className).toMatch(/break-words|wrap-anywhere/);
  });

  it("sin descripción no reserva hueco", () => {
    const { container } = render(<ProfileHeader profile={PROFILE} {...props} />);
    expect(container.querySelector("[data-bio]")).toBeNull();
  });
});

describe("ProfileHeader: denunciar persona (MOD-002)", () => {
  it("aparece en perfiles ajenos, también para visitantes (que van al login), y no en el propio", () => {
    const { rerender } = render(<ProfileHeader profile={PROFILE} {...props} />);
    expect(screen.getByRole("button", { name: "Denunciar persona" })).toBeDefined();
    rerender(<ProfileHeader profile={PROFILE} {...props} signedIn={false} />);
    expect(screen.getByRole("link", { name: "Denunciar persona" }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent("/u/perfil_b")}`,
    );
    rerender(<ProfileHeader profile={{ ...PROFILE, viewerRelation: "self" }} {...props} />);
    expect(screen.queryByText("Denunciar persona")).toBeNull();
  });

  it("es una acción distinta de Bloquear y de Denunciar encuesta", () => {
    render(<ProfileHeader profile={PROFILE} {...props} onBlock={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Bloquear" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Denunciar persona" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /denunciar encuesta/i })).toBeNull();
  });
});
