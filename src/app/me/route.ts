import { NextResponse } from "next/server";
import { getMyProfile } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";

// /me lleva al perfil propio (V2-006): sin sesión, al login; sin @usuario, al onboarding.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return go("/login?next=%2Fme");
    const profile = await getMyProfile(supabase);
    if (!profile.ok) return go("/me/error");
    return go(profile.data ? `/u/${profile.data.username}` : "/onboarding?next=%2Fme");
  } catch {
    return go("/me/error");
  }
}
