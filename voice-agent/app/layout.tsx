import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manito · Voice agent",
  description: "Voice validation agent demo for Impaktemos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Algunas extensiones del navegador agregan atributos a <html>; no es un error nuestro
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
