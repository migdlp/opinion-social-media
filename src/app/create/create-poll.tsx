"use client";

import { useRouter } from "next/navigation";
import { findPublishedPoll, publishPoll } from "@/app/create-actions";
import { PollCreationForm } from "@/components/poll-creation-form";

// Conecta el formulario con la acción de servidor y lleva al detalle de la nueva encuesta.
export function CreatePoll() {
  const router = useRouter();
  return (
    <PollCreationForm
      onSubmit={({ question, options }) => publishPoll(question, options)}
      onRecover={({ question, options }) => findPublishedPoll(question, options)}
      onPublished={(id) => router.push(`/polls/${id}`)}
    />
  );
}
