import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Nutrition Planning OS",
  description: "Sign in to access your nutrition planning dashboard",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page has its own simple layout without header/nav
  return <>{children}</>;
}
