import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { OnboardingContent } from "./onboarding-content";

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <OnboardingContent searchParams={searchParams} />
    </Suspense>
  );
}
