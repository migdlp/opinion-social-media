import Link from "next/link";
import type { PollAuthor as PollAuthorData } from "@/lib/data/types";

// Firma de una encuesta (V2-003): @usuario enlazado a su perfil y, si lo tiene, su nombre
// visible. Sin perfil (S-5) se muestra «Anónimo», sin enlace. Objetivo táctil de 44 px.
export function PollAuthor({ author }: { author?: PollAuthorData | null }) {
  if (!author) return <span>Anónimo</span>;
  return (
    <span>
      <Link
        href={`/u/${author.username}`}
        className="relative z-10 inline-flex min-h-11 items-center font-medium text-foreground hover:underline"
      >
        @{author.username}
      </Link>
      {author.displayName && (
        <>
          {" · "}
          <span>{author.displayName}</span>
        </>
      )}
    </span>
  );
}
