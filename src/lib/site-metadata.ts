import type { Metadata } from "next";

const APP_NAME = "Opinión";
const APP_DESCRIPTION = "Encuestas públicas: vota y descubre qué opinan los demás.";

// Metadatos por defecto de toda la app (META-001). Las páginas sin metadatos propios heredan esta
// tarjeta social; las que definen los suyos (p. ej. /polls/[id]) la sustituyen entera, porque Next
// fusiona los metadatos en superficie. Es estática: no lleva datos de ninguna cuenta ni imagen.
export const siteMetadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: "website",
    siteName: APP_NAME,
    locale: "es_ES",
  },
  twitter: { card: "summary", title: APP_NAME, description: APP_DESCRIPTION },
};
