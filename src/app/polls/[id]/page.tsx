import { Suspense } from "react";
import { PagePlaceholder } from "@/components/page-placeholder";

async function PollId({ params }: { params: PageProps<"/polls/[id]">["params"] }) {
  const { id } = await params;
  return <p className="break-all">Encuesta {id} (MVP-035).</p>;
}

export default function PollPage({ params }: PageProps<"/polls/[id]">) {
  return (
    <PagePlaceholder title="Encuesta">
      <Suspense fallback={<p>Cargando…</p>}>
        <PollId params={params} />
      </Suspense>
    </PagePlaceholder>
  );
}
