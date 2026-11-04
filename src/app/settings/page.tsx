import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { SettingsContent } from "./settings-content";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <SettingsContent />
    </Suspense>
  );
}
