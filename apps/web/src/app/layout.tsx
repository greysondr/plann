import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const newake = localFont({
  src: "../../public/fonts/NewakeFont-Demo.otf",
  variable: "--font-newake",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plann Admin",
  description: "Panel de operaciones, CRM y analíticas de Plann.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${newake.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
