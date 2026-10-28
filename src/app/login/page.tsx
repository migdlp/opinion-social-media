import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";
import { LoginContent } from "./login-content";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
