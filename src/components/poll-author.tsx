import Link from "next/link";
import type { PollAuthor as PollAuthorData } from "@/lib/data/types";

// Firma de una encuesta (V2-003): @usuario enlazado a su perfil y, si lo tiene, su nombre
// visible. Sin perfil (S-5) se muestra «Anónimo», sin enlace. En la tarjeta, que es un enlace
// entero al detalle, el enlace del autor queda por encima (z-10).
export function PollAuthor({ author }: { author?: PollAuthorData | null }) {
  if (!author) return <span>Anónimo</span>;
  return (
    <span>
      <Link
        href={`/u/${author.username}`}
        className="relative z-10 font-medium text-foreground hover:underline"
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
