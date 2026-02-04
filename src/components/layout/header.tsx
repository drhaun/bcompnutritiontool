'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFitomicsStore } from '@/lib/store';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  ChevronDown, 
  Home, 
  Settings, 
  Utensils, 
  Calendar, 
  Target, 
  FileText,
  Wrench,
  Users,
  Plus,
  SkipForward,
  LogOut,
  UserCircle,
  Shield
} from 'lucide-react';
import { isAdmin } from '@/lib/auth';

const workflowSteps = [
  { href: '/setup', label: 'Profile', step: 1 },
  { href: '/planning', label: 'Planning', step: 2 },
  { href: '/meal-plan', label: 'Meal Plan', step: 3 },
];

const toolLinks = [
  { href: '/tools/body-composition', label: 'Body Composition Calculator' },
  { href: '/tools/cronometer-dashboard', label: 'Cronometer Dashboard' },
  { href: '/tools/nutrition-analysis', label: 'Nutrition Analysis' },
  { href: '/tools/meal-planner', label: 'Meal Planner' },
  { href: '/tools/day-planner', label: 'Day Planner' },
  { href: '/tools/hydration', label: 'Hydration Calculator' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, isAuthenticated, isConfigured, signOut } = useAuth();
  const { 
    clients, 
    activeClientId, 
    selectClient, 
    getActiveClient,
    currentStep,
    setCurrentStep 
  } = useFitomicsStore();
  
  const activeClient = getActiveClient();
  const activeClients = clients.filter(c => c.status === 'active');

  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const handleSignOut = async () => {
    // Prevent double-clicks
    if (isSigningOut) return;
    setIsSigningOut(true);
    
    console.log('[Header] Starting sign out...');
    
    // Clear localStorage auth data immediately
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Clear store state
    useFitomicsStore.getState().setAuthenticated(false);
    
    // Call Supabase sign out (don't wait for it)
    signOut().catch(console.error);
    
    // Redirect immediately
    window.location.href = '/login?signedout=1';
  };

  // Determine if we're in the workflow
  const currentWorkflowStep = workflowSteps.find(s => pathname === s.href);
  const isInWorkflow = !!currentWorkflowStep;
  const isToolPage = pathname.startsWith('/tools') || pathname === '/settings';

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new') {
      router.push('/');
      return;
    }
    selectClient(clientId);
    router.push('/setup');
  };

  const handleSkipToStep = (step: number, path: string) => {
    setCurrentStep(step);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        {/* Left - Logo & OS Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/fitomicshorizontalgold.png"
              alt="Fitomics"
              width={120}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <Badge variant="outline" className="hidden sm:flex text-xs font-medium text-[#c19962] border-[#c19962]/50">
            Planning OS
          </Badge>
        </div>

        {/* Center - Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              pathname === '/'
                ? 'bg-[#00263d] text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          {/* Workflow Steps - Only show if client is selected */}
          {activeClientId && (
            <>
              <div className="h-4 w-px bg-border mx-2" />
              {workflowSteps.map((step) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className={cn(
                    'px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1',
                    pathname === step.href
                      ? 'bg-[#c19962] text-[#00263d]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                    {step.step}
                  </span>
                  <span className="hidden xl:inline">{step.label}</span>
                </Link>
              ))}
            </>
          )}

          {/* Tools Dropdown */}
          <div className="h-4 w-px bg-border mx-2" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "gap-1",
                  isToolPage && "bg-muted"
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                Tools
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Tools</DropdownMenuLabel>
              {toolLinks.map((tool) => (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href}>{tool.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {isAdmin(staff) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 text-purple-600">
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right - Client Selector */}
        <div className="flex items-center gap-3">
          {/* Skip Step Button (only in workflow) */}
          {isInWorkflow && currentWorkflowStep && currentWorkflowStep.step < 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex gap-1 text-muted-foreground"
              onClick={() => {
                const nextStep = workflowSteps.find(s => s.step === currentWorkflowStep.step + 1);
                if (nextStep) {
                  handleSkipToStep(nextStep.step, nextStep.href);
                }
              }}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip
            </Button>
          )}

          {/* Client Selector */}
          <Select
            value={activeClientId || ''}
            onValueChange={handleClientSelect}
          >
            <SelectTrigger className="w-[180px] h-9">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select client...">
                  {activeClient ? (
                    <span className="truncate">{activeClient.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Select client...</span>
                  )}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {activeClients.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No clients yet
                </div>
              ) : (
                activeClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <span>{client.name}</span>
                      {client.mealPlan && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          Plan
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
              <DropdownMenuSeparator />
              <SelectItem value="new">
                <div className="flex items-center gap-2 text-[#c19962]">
                  <Plus className="h-3.5 w-3.5" />
                  New Client
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Staff User Menu - Always show sign out for now to debug */}
          {isConfigured && (
            <>
              <div className="hidden md:flex items-center gap-2 text-sm">
                <div className="h-7 w-7 rounded-full bg-[#00263d] flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-[#c19962]" />
                </div>
                <span className="font-medium">
                  {isAuthenticated ? (staff?.name || staff?.email?.split('@')[0] || 'Staff') : 'Not logged in'}
                </span>
              </div>
              {isAuthenticated && (
                <button 
                  type="button"
                  disabled={isSigningOut}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSignOut();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 bg-white disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              )}
              {!isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign In
                </Button>
              )}
            </>
          )}

          {/* Show message when Supabase not configured */}
          {!isConfigured && (
            <Badge variant="outline" className="text-xs">Local Mode</Badge>
          )}
        </div>
      </div>

      {/* Mobile Navigation (simplified) */}
      <div className="lg:hidden border-t">
        <div className="container py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Link
              href="/"
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap',
                pathname === '/' ? 'bg-[#00263d] text-white' : 'bg-muted'
              )}
            >
              Dashboard
            </Link>
            {activeClientId && workflowSteps.map((step) => (
              <Link
                key={step.href}
                href={step.href}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1',
                  pathname === step.href ? 'bg-[#c19962] text-[#00263d]' : 'bg-muted'
                )}
              >
                <span>{step.step}</span>
                <span>{step.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
