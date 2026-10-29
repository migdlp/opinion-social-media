import { EmptyState } from "@/components/empty-state";

export default function ProfileUnavailable() {
  return (
    <div role="alert" className="mx-auto w-full max-w-content">
      <EmptyState
        title="No se ha podido abrir tu perfil"
        description="No hemos podido comprobar tu usuario. Reinténtalo en unos instantes."
        action={{ href: "/me", label: "Reintentar" }}
      />
    </div>
  );
}
