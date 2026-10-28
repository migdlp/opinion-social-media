"use client";

import { useRouter } from "next/navigation";
import { savePrivacy, saveProfile } from "@/app/profile-actions";
import { PrivacyToggle } from "@/components/privacy-toggle";
import { ProfileForm } from "@/components/profile-form";
import type { Profile } from "@/lib/data/types";

// Conecta los formularios de ajustes con las acciones de servidor.
export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-8">
      <ProfileForm
        initial={{ username: profile.username, displayName: profile.displayName }}
        onSubmit={saveProfile}
        onDone={() => router.refresh()}
      />
      <PrivacyToggle
        isPrivate={profile.isPrivate}
        onChange={async (value) => {
          const result = await savePrivacy(value);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </div>
  );
}
