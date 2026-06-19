import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import PantallaCarga from "@/components/PantallaCarga";

export const metadata: Metadata = {
  title: "Black & Red",
  description: "Sistema de pedidos Black & Red",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Black & Red",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="flex min-h-screen flex-col">
        {/* Splash de arranque: se desvanece solo (ver .splash-boot en globals.css) */}
        <div className="splash-boot">
          <PantallaCarga />
        </div>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
