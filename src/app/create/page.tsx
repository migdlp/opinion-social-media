import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { CreateForm } from "./create-form";
import { pageTitle } from "@/lib/page-titles";

export const metadata: Metadata = { title: pageTitle("Crear encuesta") };

export default function CreatePollPage() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <h1 className="text-2xl font-semibold">Crear encuesta</h1>
      <Suspense fallback={<LoadingState label="Cargando…" />}>
        <CreateForm />
      </Suspense>
    </div>
  );
}
