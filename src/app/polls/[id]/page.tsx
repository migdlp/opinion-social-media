import { Suspense } from "react";
import { PollSkeleton } from "@/components/skeletons";
import { pollMetadata } from "./metadata";
import { PollDetailLoader } from "./poll-detail";

export async function generateMetadata({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  return pollMetadata(id);
}

async function Detail({ params }: { params: PageProps<"/polls/[id]">["params"] }) {
  const { id } = await params;
  return <PollDetailLoader id={id} />;
}

export default function PollPage({ params }: PageProps<"/polls/[id]">) {
  return (
    <Suspense fallback={<PollSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}
