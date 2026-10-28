"use client";

import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/profile-actions";
import { ProfileForm } from "@/components/profile-form";

// Conecta el formulario con la acción de servidor y vuelve a la ruta de la que se venía.
export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  return (
    <ProfileForm
      onSubmit={saveProfile}
      onDone={() => {
        router.push(next);
        router.refresh();
      }}
    />
  );
}
