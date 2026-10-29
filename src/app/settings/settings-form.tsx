"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { signOut } from "@/app/auth/actions";
import { savePrivacy, saveProfile, saveVoteVisibility } from "@/app/profile-actions";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { ProfileForm } from "@/components/profile-form";
import { ThemeSelector } from "@/components/theme-selector";
import { VoteVisibilityPicker } from "@/components/vote-visibility-picker";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { Profile, Result, VoteVisibility } from "@/lib/data/types";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// Conecta los apartados de ajustes con las acciones de servidor (V2-008, SETTINGS-001).
export function SettingsForm({
  profile,
  voteVisibility,
}: {
  profile: Profile;
  voteVisibility: Result<VoteVisibility>;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-5">
      <Section title="Perfil" description="Así apareces en tus encuestas y en tu perfil.">
        <ProfileForm
          initial={{ username: profile.username, displayName: profile.displayName }}
          onSubmit={saveProfile}
          onDone={() => router.refresh()}
        />
      </Section>
      <Section title="Apariencia" description="Elige entre el tema del sistema, claro u oscuro.">
        <div>
          <ThemeSelector />
        </div>
      </Section>
      <Section title="Privacidad">
        <PrivacyToggle
          isPrivate={profile.isPrivate}
          onChange={async (value) => {
            const result = await savePrivacy(value);
            if (result.ok) router.refresh();
            return result;
          }}
        />
        <hr className="border-border" />
        {voteVisibility.ok ? (
          <VoteVisibilityPicker value={voteVisibility.data} onChange={saveVoteVisibility} />
        ) : (
          <div role="alert" className="flex flex-col gap-2 text-sm">
            <p className="text-danger">
              No se ha podido cargar quién puede ver las encuestas que votas.{" "}
              {ERROR_MESSAGES[voteVisibility.error]}
            </p>
            <Link href="/settings" className="self-start font-semibold underline">
              Reintentar
            </Link>
          </div>
        )}
      </Section>
      <Section title="Cuenta">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/me"
            className="inline-flex min-h-11 items-center rounded-full border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground"
          >
            Volver a mi perfil
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 rounded-full border border-field px-5 text-sm font-semibold transition-colors hover:border-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </Section>
    </div>
  );
}
