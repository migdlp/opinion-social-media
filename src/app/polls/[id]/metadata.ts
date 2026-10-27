import type { Metadata } from "next";
import { getPollDetail } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

const UNAVAILABLE: Metadata = { title: "No disponible", robots: { index: false } };

// Título y descripción compartibles de /polls/[id]. Se leen como visitante
// (signedIn: false) para que nunca entren votos ni resultados en el HTML o en las
// tarjetas sociales. Oculta, inexistente o mal formada no revelan nada.
export async function pollMetadata(id: string): Promise<Metadata> {
  const supabase = await createClient();
  const detail = await getPollDetail(supabase, id, { signedIn: false });
  if (!detail.ok) return detail.error === "POLL_UNAVAILABLE" ? UNAVAILABLE : {};

  const { question, options } = detail.data.poll;
  const description = `${options.map((o) => o.text).join(" · ")}. Vota para ver los resultados.`;
  return {
    title: question,
    description,
    openGraph: { title: question, description, type: "website" },
    twitter: { card: "summary", title: question, description },
  };
}
