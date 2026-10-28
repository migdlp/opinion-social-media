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
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-border bg-surface px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      {links.map(({ href, label, icon, active }) => (
        <Link
          key={label}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[13px] ${active ? "font-semibold text-foreground" : "text-muted hover:text-foreground"}`}
        >
          <NavigationIcon name={icon} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
