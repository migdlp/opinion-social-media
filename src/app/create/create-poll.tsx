"use client";

import { useRouter } from "next/navigation";
import { findPublishedPoll, publishPoll } from "@/app/create-actions";
import type { Category } from "@/lib/data/types";
import { PollCreationForm } from "@/components/poll-creation-form";

// Conecta el formulario con la acción de servidor y lleva al detalle de la nueva encuesta.
export function CreatePoll({ categories }: { categories: Category[] }) {
  const router = useRouter();
  return (
    <PollCreationForm
      onSubmit={({ question, options, closesAt, category, commentsEnabled }) =>
        publishPoll(question, options, closesAt, category, commentsEnabled)
      }
      categories={categories}
      onRecover={({ question, options }) => findPublishedPoll(question, options)}
      onPublished={(id) => router.push(`/polls/${id}`)}
    />
  );
}
