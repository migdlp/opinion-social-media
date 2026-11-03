import { redirect } from "next/navigation";
import { BlockedAccounts } from "@/components/blocked-accounts";
import { EmptyState } from "@/components/empty-state";
import { loginPath, onboardingPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import { getMyProfile, getMyVoteVisibility, listBlockedUsers } from "@/lib/data/operations";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

const SETTINGS_PATH = "/settings";

// Ajustes de perfil y privacidad (V2-008). Sin sesión se va al login y se vuelve aquí; sin
// perfil se elige primero el @usuario.
export async function SettingsContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(loginPath(SETTINGS_PATH));

  const profile = await getMyProfile(supabase);
  if (profile.ok && !profile.data) redirect(onboardingPath(SETTINGS_PATH));
  if (!profile.ok || !profile.data) {
    return (
      <div role="alert" className="mx-auto w-full max-w-content">
        <EmptyState
          title="No se han podido cargar tus ajustes"
          description={ERROR_MESSAGES[profile.ok ? "UNKNOWN" : profile.error]}
          action={{ href: SETTINGS_PATH, label: "Reintentar" }}
        />
      </div>
    );
  }

  const [voteVisibility, blocked] = await Promise.all([
    getMyVoteVisibility(supabase),
    listBlockedUsers(supabase, null),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <SettingsForm profile={profile.data} voteVisibility={voteVisibility} />
      {blocked.ok ? (
        <BlockedAccounts users={blocked.data.users} nextCursor={blocked.data.nextCursor} />
      ) : (
        <section
          id="bloqueados"
          aria-labelledby="bloqueados-titulo"
          className="flex flex-col gap-2"
        >
          <h2 id="bloqueados-titulo" className="text-lg font-semibold tracking-[-0.01em]">
            Cuentas bloqueadas
          </h2>
          <p role="alert" className="text-sm text-danger">
            {ERROR_MESSAGES[blocked.error]}
          </p>
          <a href="/settings#bloqueados" className="text-sm font-semibold underline">
            Reintentar
          </a>
        </section>
      )}
    </div>
  );
}
