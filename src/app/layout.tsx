import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Kalam } from "next/font/google";
import { Toaster } from "@/components/client/toaster";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

// Endereço público, para os links de preview (Open Graph) saírem absolutos.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Laço — amigo secreto no papelzinho", template: "%s · Laço" },
  description:
    "Amigo secreto para a família e os amigos: sorteio pelo link, conta sem senha, papelzinho lacrado, conversa anônima e modo festa.",
  applicationName: "Laço",
  appleWebApp: { capable: true, title: "Laço", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#c2183c" },
    { media: "(prefers-color-scheme: dark)", color: "#17111a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${kalam.variable} antialiased`}>
      <body className="theme">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
