import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { PollDetailLoader } from "./poll-detail";

async function Detail({ params }: { params: PageProps<"/polls/[id]">["params"] }) {
  const { id } = await params;
  return <PollDetailLoader id={id} />;
}

export default function PollPage({ params }: PageProps<"/polls/[id]">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando encuesta…" />}>
      <Detail params={params} />
    </Suspense>
  );
}
