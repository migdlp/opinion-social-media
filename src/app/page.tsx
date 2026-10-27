import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { Feed } from "./feed";

export default function FeedPage() {
  return (
    <>
      <h1 className="sr-only">Encuestas</h1>
      <Suspense fallback={<LoadingState label="Cargando encuestas…" />}>
        <Feed />
      </Suspense>
    </>
  );
}
