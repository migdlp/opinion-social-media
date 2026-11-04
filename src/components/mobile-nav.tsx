"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { loginPath } from "@/lib/auth/redirect";
import { NavigationIcon } from "./navigation-icon";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const profileActive =
    pathname === "/me" ||
    pathname.startsWith("/u/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/solicitudes" ||
    pathname === "/onboarding";
  const links = [
    { href: "/", label: "Feed", icon: "feed" as const, active: pathname === "/" },
    { href: "/search", label: "Buscar", icon: "search" as const, active: pathname === "/search" },
    { href: "/create", label: "Crear", icon: "create" as const, active: pathname === "/create" },
    {
      href: signedIn ? "/me" : loginPath("/me"),
      label: "Perfil",
      icon: "profile" as const,
      active: profileActive,
    },
  ];

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      {links.map(({ href, label, icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${active ? "font-semibold text-foreground dark:text-accent" : "text-muted hover:text-foreground"}`}
        >
          <span
            className={
              icon === "create"
                ? "flex h-7 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"
                : "flex h-7 items-center justify-center"
            }
          >
            <NavigationIcon name={icon} />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
