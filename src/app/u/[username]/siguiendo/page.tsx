import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { FollowListContent } from "../follow-list-content";

export default function Page({ params }: PageProps<"/u/[username]/siguiendo">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <FollowListContent params={params} kind="siguiendo" />
    </Suspense>
  );
}
