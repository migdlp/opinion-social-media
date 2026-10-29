import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { ProfileContent } from "./profile-content";
import { profileTitle } from "@/lib/page-titles";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: profileTitle(username) };
}

export default function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando perfil…" />}>
      <ProfileContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
