import { siteMetadata } from "@/lib/site-metadata";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { GeistSans } from "geist/font/sans";
import { Header } from "@/components/header";
import { Suspense } from "react";
import { MobileNavigation, MobileNavigationFallback } from "@/components/mobile-navigation";
import "./globals.css";

export const metadata = siteMetadata;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html suppressHydrationWarning lang="es" className={`${GeistSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
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
        <Suspense fallback={<MobileNavigationFallback />}>
          <MobileNavigation />
        </Suspense>
      </body>
    </html>
  );
}
