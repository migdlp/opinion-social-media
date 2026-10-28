import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { RequestsContent } from "./requests-content";

export default function RequestsPage() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Solicitudes de seguimiento</h1>
      <Suspense fallback={<LoadingState label="Cargando…" />}>
        <RequestsContent />
      </Suspense>
    </div>
  );
}
