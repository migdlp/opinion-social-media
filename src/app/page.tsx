import { Suspense } from "react";
import { FeedSkeleton } from "@/components/skeletons";
import { Feed } from "./feed";

export default function FeedPage() {
  return (
    <>
      <h1 className="sr-only">Encuestas</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </>
  );
}
