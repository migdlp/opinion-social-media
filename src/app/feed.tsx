import { FeedList } from "@/components/feed-list";
import { getFeedPage } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

// Primer lote del feed, cargado en el servidor por petición (lee la sesión de las
// cookies, así que nunca se cachea). La paginación llega con MVP-034.
export async function Feed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const page = await getFeedPage(supabase, null, { signedIn: Boolean(data.user) });
  return <FeedList page={page} />;
}
