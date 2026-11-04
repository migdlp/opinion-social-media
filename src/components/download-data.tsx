"use client";

import { useId, useState } from "react";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { Result } from "@/lib/data/types";

type ExportFile = { filename: string; content: string };

// Apartado «Descargar mis datos» de Ajustes (ACCOUNT-003). El JSON llega de una acción de servidor
// y se descarga en el cliente con un Blob y un enlace temporal; no se guarda en ningún servidor.
export function DownloadData({ onExport }: { onExport: () => Promise<Result<ExportFile>> }) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function download() {
    setPending(true);
    setMessage(null);
    try {
      const result = await onExport();
      if (!result.ok) {
        setMessage({ kind: "error", text: ERROR_MESSAGES[result.error] });
        return;
      }
      const url = URL.createObjectURL(
        new Blob([result.data.content], { type: "application/json;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ kind: "ok", text: "Descarga lista." });
    } catch {
      setMessage({ kind: "error", text: ERROR_MESSAGES.NETWORK_ERROR });
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="descargar" aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold tracking-[-0.01em]">
          Descargar mis datos
        </h2>
        <p className="text-[13px] text-muted">
          Recibirás un archivo JSON con tu perfil, encuestas, votos, comentarios, relaciones,
          ajustes y denuncias.
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={download}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Preparando…" : "Descargar mis datos"}
        </button>
      </div>
      <p
        role={message?.kind === "error" ? "alert" : "status"}
        className={message?.kind === "error" ? "text-sm text-danger" : "text-sm text-muted"}
      >
        {message?.text ?? ""}
      </p>
    </section>
  );
}
