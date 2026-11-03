import { cache } from "react";
import { getMyProfile } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

// React cache comparte esta lectura sólo durante el render de una petición, entre
// cabecera y barra móvil. No es `use cache` ni una caché compartida entre usuarios.
export const getNavigationAccount = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { signedIn: false, username: null, avatarIcon: null };
    const profile = await getMyProfile(supabase);
    return {
      signedIn: true,
      username: profile.ok ? (profile.data?.username ?? null) : null,
      avatarIcon: profile.ok ? (profile.data?.avatarIcon ?? null) : null,
    };
  } catch {
    return { signedIn: false, username: null, avatarIcon: null };
  }
});
