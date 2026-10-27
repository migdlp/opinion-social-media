import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opinión",
  description: "Encuestas públicas: vota y descubre qué opinan los demás.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-20"
        >
          Saltar al contenido
        </a>
        <Header />
        <main
          id="contenido"
          className="mx-auto flex w-full max-w-wide flex-1 flex-col px-4 py-5 sm:py-8"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
