import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nico Lombardi — Business Development, Fintech & AI",
  description:
    "Nico Lombardi is a business development leader with 10+ years in fintech, AI consulting, and operations. Based in Madrid, working globally.",
  openGraph: {
    title: "Nico Lombardi — Business Development, Fintech & AI",
    description:
      "10+ years driving growth at the intersection of fintech, AI and operations. Based in Madrid, working globally.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nico Lombardi — Business Development, Fintech & AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nico Lombardi — Business Development, Fintech & AI",
    description:
      "10+ years driving growth at the intersection of fintech, AI and operations.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
