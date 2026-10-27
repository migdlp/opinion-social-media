import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { PagePlaceholder } from "@/components/page-placeholder";

async function PollId({ params }: { params: PageProps<"/polls/[id]">["params"] }) {
  const { id } = await params;
  return <p className="break-all">Encuesta {id} (MVP-035).</p>;
}

export default function PollPage({ params }: PageProps<"/polls/[id]">) {
  return (
    <PagePlaceholder title="Encuesta">
      <Suspense fallback={<LoadingState label="Cargando encuesta…" />}>
        <PollId params={params} />
      </Suspense>
    </PagePlaceholder>
  );
}
