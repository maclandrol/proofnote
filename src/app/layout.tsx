import type { Metadata } from "next";
import { Source_Sans_3, Geist_Mono } from "next/font/google";
import { Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Analytics } from "@vercel/analytics/next";
import "./proof-atlas.css";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Source_Sans_3({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = { title: { default: "Proof Notes", template: "%s" }, description: "Frontier LLMs check the mathematical claims in machine learning papers and, where possible, propose repairs.", twitter: { card: "summary_large_image" }, metadataBase: new URL("https://proofnote.enoutahi.com") };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppHeader />
          <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
            <div className="proof-atlas">{children}</div>
          </main>
          <AppFooter />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
