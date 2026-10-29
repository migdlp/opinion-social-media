import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { loginPath, onboardingPath, safeNextPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { getMyProfile } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Elegir @usuario tras el primer login (V2-002). Sin sesión se va al login y se vuelve aquí;
// con perfil ya creado se retoma el destino, también si una recarga llega tras guardar.
export async function OnboardingContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNextPath(first(params.next));

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(loginPath(onboardingPath(next)));

  const profile = await getMyProfile(supabase);
  if (profile.ok && profile.data) redirect(next.startsWith("/onboarding") ? "/" : next);
  if (!profile.ok) {
    return (
      <div role="alert" className="mx-auto w-full max-w-content">
        <EmptyState
          title="No se ha podido comprobar tu perfil"
          description={ERROR_MESSAGES[profile.error]}
          action={{ href: onboardingPath(next), label: "Reintentar" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-4">
      <h1 className="text-2xl font-semibold">Elige tu usuario</h1>
      <p className="text-muted">
        Es el nombre con el que firmarás tus encuestas. Lo necesitas para crear, votar y seguir.
      </p>
      <OnboardingForm next={next} />
    </div>
  );
}
