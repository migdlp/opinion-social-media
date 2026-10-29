import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { FollowListContent } from "../follow-list-content";
import { profileTitle } from "@/lib/page-titles";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]/seguidores">): Promise<Metadata> {
  const { username } = await params;
  return { title: profileTitle(username, "Seguidores de ") };
}

export default function Page({ params }: PageProps<"/u/[username]/seguidores">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <FollowListContent params={params} kind="seguidores" />
    </Suspense>
  );
}
