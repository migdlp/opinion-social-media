import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { OnboardingContent } from "./onboarding-content";
import { pageTitle } from "@/lib/page-titles";

export const metadata: Metadata = { title: pageTitle("Elige tu usuario") };

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <OnboardingContent searchParams={searchParams} />
    </Suspense>
  );
}
