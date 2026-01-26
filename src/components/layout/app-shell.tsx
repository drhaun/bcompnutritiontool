'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { FloatingNotes } from '@/components/layout/floating-notes';

// Routes that don't require authentication or the app shell
const publicRoutes = ['/login', '/auth'];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  
  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

  // Public routes - render without shell
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Protected routes - wrap with AuthGuard and show app shell
  return (
    <AuthGuard>
      <Header />
      <main>{children}</main>
      <FloatingNotes />
    </AuthGuard>
  );
}
