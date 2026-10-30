import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/skeletons";
import { pageTitle } from "@/lib/page-titles";
import { SearchContent } from "./search-content";

export const metadata: Metadata = { title: pageTitle("Buscar") };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto flex w-full max-w-wide flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Buscar</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
