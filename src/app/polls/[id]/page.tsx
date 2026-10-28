import { Suspense } from "react";
import { PollSkeleton } from "@/components/skeletons";
import { pollMetadata } from "./metadata";
import { PollDetailLoader } from "./poll-detail";

export async function generateMetadata({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  return pollMetadata(id);
}

async function Detail({
  params,
  searchParams,
}: {
  params: PageProps<"/polls/[id]">["params"];
  searchParams: PageProps<"/polls/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { option } = await searchParams;
  return <PollDetailLoader id={id} option={typeof option === "string" ? option : undefined} />;
}

export default function PollPage({ params, searchParams }: PageProps<"/polls/[id]">) {
  return (
    <Suspense fallback={<PollSkeleton />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
