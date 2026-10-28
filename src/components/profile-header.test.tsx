// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileView } from "@/lib/data/types";
import { ProfileHeader } from "./profile-header";

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
});
