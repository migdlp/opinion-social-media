import { getCategories } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";
import { CreatePoll } from "./create-poll";

// La categoría es opcional: si la lista no se puede leer, el formulario funciona sin ella.
export async function CreateForm() {
  const categories = await createClient()
    .then(getCategories)
    .catch(() => null);
  return <CreatePoll categories={categories?.ok ? categories.data : []} />;
}
