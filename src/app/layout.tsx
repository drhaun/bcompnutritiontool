import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { PersistenceProvider } from "@/components/layout/persistence-provider";
import { LocalOnlyBanner } from "@/components/layout/local-only-banner";
import { AppShell } from "@/components/layout/app-shell";
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
  title: "Nutrition Planning OS - Fitomics",
  description: "Professional nutrition planning OS for coaches and fitness professionals",
  icons: {
    icon: "/images/fitomics-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AuthProvider>
          <LocalOnlyBanner />
          <PersistenceProvider />
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
