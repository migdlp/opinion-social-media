import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { ProfileContent } from "./profile-content";

export default function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando perfil…" />}>
      <ProfileContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
