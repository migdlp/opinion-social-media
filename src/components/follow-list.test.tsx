// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FollowEntry, FollowPage, Result } from "@/lib/data/types";
import { FollowList } from "./follow-list";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const user = (n: number): FollowEntry => ({
  username: `usuario_${n}`,
  displayName: n % 2 ? `Nombre ${n}` : null,
});
type Load = (cursor: string) => Promise<Result<FollowPage>>;
type Act = (username: string) => Promise<Result<void>>;
type Respond = (username: string, accept: boolean) => Promise<Result<void>>;

describe("FollowList (AVATAR-001)", () => {
  it("muestra el icono elegido por cada persona y las iniciales de quien no lo tiene", () => {
    const { container } = render(
      <FollowList
        initialUsers={[{ ...user(1), avatarIcon: "luna" }, user(2)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Nadie"
      />,
    );
    expect(container.querySelectorAll("[data-avatar-icon]")).toHaveLength(1);
    expect(container.querySelector('[data-avatar-icon="luna"]')).not.toBeNull();
    expect(screen.getByText("US")).toBeTruthy();
  });
});

describe("FollowList", () => {
  it("lista a cada persona con enlace a su perfil, sin acciones de gestión por defecto", () => {
    render(
      <FollowList
        initialUsers={[user(1), user(2)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Nadie"
      />,
    );
    const link = screen.getByRole("link", { name: /Nombre 1/ });
    expect(link.getAttribute("href")).toBe("/u/usuario_1");
    expect(screen.getByRole("link", { name: /@usuario_2/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Eliminar|Aceptar|Rechazar/ })).toBeNull();
    expect(screen.getByText("No hay más")).toBeTruthy();
  });

  it("sin personas muestra el texto vacío", () => {
    render(
      <FollowList
        initialUsers={[]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Todavía no tiene seguidores"
      />,
    );
    expect(screen.getByText("Todavía no tiene seguidores")).toBeTruthy();
  });

  it("«Cargar más» añade la siguiente página sin duplicados", async () => {
    const loadMore = vi.fn<Load>(async () => ({
      ok: true,
      data: { users: [user(2), user(3)], nextCursor: null },
    }));
    render(
      <FollowList
        initialUsers={[user(1), user(2)]}
        initialCursor="c1"
        loadMore={loadMore}
        emptyText="Nadie"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(loadMore).toHaveBeenCalledWith("c1");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
  });

  it("si falla la carga avisa y conserva el botón", async () => {
    const loadMore = vi.fn<Load>(async () => ({ ok: false, error: "NETWORK_ERROR" }));
    render(
      <FollowList
        initialUsers={[user(1)]}
        initialCursor="c1"
        loadMore={loadMore}
        emptyText="Nadie"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cargar más" })).toBeTruthy();
  });

  it("Eliminar pide confirmación y quita a la persona de la lista", async () => {
    const onRemove = vi.fn<Act>(async () => ({ ok: true, data: undefined }));
    render(
      <FollowList
        initialUsers={[user(1), user(2)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Nadie"
        onRemove={onRemove}
      />,
    );
    const first = screen.getAllByRole("listitem")[0];
    await userEvent.click(within(first).getByRole("button", { name: "Eliminar" }));
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(within(first).getByRole("button", { name: "Confirmar" }));
    expect(onRemove).toHaveBeenCalledWith("usuario_1");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText(/usuario_1/)).toBeNull();
  });

  it("Cancelar la confirmación no elimina", async () => {
    const onRemove = vi.fn<Act>(async () => ({ ok: true, data: undefined }));
    render(
      <FollowList
        initialUsers={[user(1)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Nadie"
        onRemove={onRemove}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeTruthy();
  });

  it("si Eliminar falla conserva a la persona y explica el motivo", async () => {
    const onRemove = vi.fn<Act>(async () => ({ ok: false, error: "NETWORK_ERROR" }));
    render(
      <FollowList
        initialUsers={[user(1)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Nadie"
        onRemove={onRemove}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("Aceptar y Rechazar responden a la solicitud y la retiran de la bandeja", async () => {
    const onRespond = vi.fn<Respond>(async () => ({ ok: true, data: undefined }));
    render(
      <FollowList
        initialUsers={[user(1), user(2)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Sin solicitudes"
        onRespond={onRespond}
      />,
    );
    const [one, two] = screen.getAllByRole("listitem");
    await userEvent.click(within(one).getByRole("button", { name: "Aceptar" }));
    expect(onRespond).toHaveBeenLastCalledWith("usuario_1", true);
    await userEvent.click(within(two).getByRole("button", { name: "Rechazar" }));
    expect(onRespond).toHaveBeenLastCalledWith("usuario_2", false);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText("Sin solicitudes")).toBeTruthy();
  });

  it("USER_NOT_FOUND al responder significa que ya no está pendiente: se retira igualmente", async () => {
    const onRespond = vi.fn<Respond>(async () => ({ ok: false, error: "USER_NOT_FOUND" }));
    render(
      <FollowList
        initialUsers={[user(1)]}
        initialCursor={null}
        loadMore={vi.fn<Load>()}
        emptyText="Sin solicitudes"
        onRespond={onRespond}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
