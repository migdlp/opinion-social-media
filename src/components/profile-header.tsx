import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import type { ProfileView, Result } from "@/lib/data/types";

const number = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

type ProfileHeaderProps = {
  profile: ProfileView;
  signedIn: boolean;
  onFollow: (username: string) => Promise<Result<"accepted" | "pending">>;
  onUnfollow: (username: string) => Promise<Result<void>>;
};

// Cabecera del perfil (V2-006): avatar de iniciales, nombre visible, @usuario, contadores (que
// enlazan a las listas de V2-009; son públicos también en cuentas privadas, S-4) y botón de seguir.
export function ProfileHeader({ profile, signedIn, onFollow, onUnfollow }: ProfileHeaderProps) {
  const base = `/u/${profile.username}`;
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        <Avatar username={profile.username} displayName={profile.displayName} size="lg" />
        <div className="flex min-w-0 flex-col">
          <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">
            {profile.displayName ?? `@${profile.username}`}
          </h1>
          {profile.displayName && <p className="text-muted">@{profile.username}</p>}
          {profile.isPrivate && (
            <p className="mt-1 self-start rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium text-muted">
              Cuenta privada
            </p>
          )}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        <li>
          <Link href={`${base}/seguidores`} className="hover:underline">
            <span className="font-semibold tabular-nums">
              {number.format(profile.followersCount)}
            </span>{" "}
            <span className="text-muted">seguidores</span>
          </Link>
        </li>
        <li>
          <Link href={`${base}/siguiendo`} className="hover:underline">
            <span className="font-semibold tabular-nums">
              {number.format(profile.followingCount)}
            </span>{" "}
            <span className="text-muted">siguiendo</span>
          </Link>
        </li>
        <li>
          <span className="font-semibold tabular-nums">{number.format(profile.pollsCount)}</span>{" "}
          <span className="text-muted">{profile.pollsCount === 1 ? "encuesta" : "encuestas"}</span>
        </li>
      </ul>
      <FollowButton
        username={profile.username}
        relation={profile.viewerRelation}
        signedIn={signedIn}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
      />
    </header>
  );
}
