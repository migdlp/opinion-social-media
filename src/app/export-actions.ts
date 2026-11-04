"use server";

import { toAppError } from "@/lib/data/errors";
import { exportMyData } from "@/lib/data/operations";
import type { Result } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

export type DataExportFile = { filename: string; content: string };

// Copia de los datos propios (ACCOUNT-003). Sin sesión no se llega a la base de datos; con ella,
// export_my_data impone la autorización y el límite de una vez cada 10 minutos. El JSON se
// devuelve al navegador, que lo descarga: nunca se guarda en el servidor ni en Storage.
export async function exportDataAction(): Promise<Result<DataExportFile>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "AUTH_REQUIRED" };
    const result = await exportMyData(supabase);
    if (!result.ok) return result;
    return {
      ok: true,
      data: {
        filename: `opinion-datos-${new Date().toISOString().slice(0, 10)}.json`,
        content: JSON.stringify(result.data, null, 2),
      },
    };
  } catch (error) {
    return { ok: false, error: toAppError(error) };
  }
}
