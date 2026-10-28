import { Suspense } from "react";
import { FeedSkeleton } from "@/components/skeletons";
import { Feed } from "./feed";

export default function FeedPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <h1 className="sr-only">Encuestas</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </>
  );
}
