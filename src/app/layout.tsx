import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const displayFace = Sora({
  subsets: ["latin"],
  variable: "--font-display"
});

const monoFace = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  description: "Logical multi-tenant SaaS starter with onboarding, members, billing, and API keys.",
  title: "Booster SaaS Starter"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className={`${displayFace.variable} ${monoFace.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}
