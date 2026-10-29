"use client";

import { saveProfile } from "@/app/profile-actions";
import { ProfileForm } from "@/components/profile-form";

// /me puede haberse precargado sin perfil y redirigir al onboarding. Tras guardar,
// navegar por documento evita reutilizar esa redirección y renueva también la cabecera.
export function OnboardingForm({ next }: { next: string }) {
  return (
    <ProfileForm
      onSubmit={saveProfile}
      onDone={() => {
        window.location.assign(next);
      }}
    />
  );
}
