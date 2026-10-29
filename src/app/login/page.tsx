import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { LoginContent } from "./login-content";
import { pageTitle } from "@/lib/page-titles";

export const metadata: Metadata = { title: pageTitle("Iniciar sesión") };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
