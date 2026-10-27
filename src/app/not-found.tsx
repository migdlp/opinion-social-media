import Link from "next/link";
import { PagePlaceholder } from "@/components/page-placeholder";

export default function NotFound() {
  return (
    <PagePlaceholder title="No disponible">
      <p>La página que buscas no existe o no está disponible.</p>
      <Link href="/" className="underline">
        Volver al feed
      </Link>
    </PagePlaceholder>
  );
}
