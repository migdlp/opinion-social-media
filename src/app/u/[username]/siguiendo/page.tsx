import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { FollowListContent } from "../follow-list-content";
import { profileTitle } from "@/lib/page-titles";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]/siguiendo">): Promise<Metadata> {
  const { username } = await params;
  return { title: profileTitle(username, "Siguiendo de ") };
}

export default function Page({ params }: PageProps<"/u/[username]/siguiendo">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <FollowListContent params={params} kind="siguiendo" />
    </Suspense>
  );
}
