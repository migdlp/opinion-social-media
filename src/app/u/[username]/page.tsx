import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { ProfileContent } from "./profile-content";
import { profileDescription, profileTitle } from "@/lib/page-titles";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const title = profileTitle(username);
  const description = profileDescription(username);
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

export default function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando perfil…" />}>
      <ProfileContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
