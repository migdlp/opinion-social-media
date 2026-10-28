import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { FollowListContent } from "../follow-list-content";

export default function Page({ params }: PageProps<"/u/[username]/seguidores">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <FollowListContent params={params} kind="seguidores" />
    </Suspense>
  );
}
