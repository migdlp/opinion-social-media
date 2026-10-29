import Link from "next/link";
import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";
import { pageTitle } from "@/lib/page-titles";

export const metadata: Metadata = { title: pageTitle("No disponible") };

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
