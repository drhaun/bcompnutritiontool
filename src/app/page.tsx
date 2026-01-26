'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowRight, 
  Target, 
  Utensils, 
  FileText, 
  Sparkles, 
  Droplets, 
  Calendar, 
  ChefHat, 
  Beaker,
  Plus,
  Users,
  Clock,
  Search,
  UserPlus,
  FolderOpen,
  Archive,
  MoreHorizontal,
  Trash2,
  Copy,
  Edit,
  CheckCircle2,
  AlertCircle,
  User,
  Activity,
  Settings,
  ArrowUpRight
} from 'lucide-react';
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { ClientProfile } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { 
    clients, 
    activeClientId, 
    createClient, 
    selectClient, 
    deleteClient,
    archiveClient,
    duplicateClient,
    getActiveClient 
  } = useFitomicsStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const activeClient = getActiveClient();
  
  // Filter and sort clients
  const activeClients = useMemo(() => {
    return clients
      .filter(c => c.status === 'active')
      .filter(c => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.notes?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [clients, searchQuery]);

  const archivedClients = clients.filter(c => c.status === 'archived');
  
  const recentClients = activeClients.slice(0, 5);

  const handleCreateClient = () => {
    if (!newClientName.trim()) return;
    
    const clientId = createClient(newClientName.trim(), newClientEmail.trim() || undefined, newClientNotes.trim() || undefined);
    setIsNewClientOpen(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientNotes('');
    router.push('/setup');
  };

  const handleSelectClient = (clientId: string) => {
    selectClient(clientId);
    router.push('/setup');
  };

  const getProgressBadge = (client: ClientProfile) => {
    const step = client.currentStep;
    if (client.mealPlan) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Plan Complete</Badge>;
    }
    if (step >= 4) {
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Ready to Generate</Badge>;
    }
    if (step >= 2) {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
    }
    return <Badge variant="outline">New</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Client Card */}
            {activeClient && (
              <Card className="border-[#c19962] bg-gradient-to-br from-[#c19962]/5 to-transparent">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#c19962]" />
                      Current Client
                    </CardTitle>
                    {getProgressBadge(activeClient)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-semibold">{activeClient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activeClient.userProfile?.gender && `${activeClient.userProfile.gender} • `}
                        {activeClient.userProfile?.age && `${activeClient.userProfile.age} years • `}
                        {activeClient.userProfile?.weightLbs && `${activeClient.userProfile.weightLbs} lbs`}
                        {!activeClient.userProfile?.gender && 'Profile not yet complete'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated: {formatDate(activeClient.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => router.push('/setup')}>
                        {activeClient.mealPlan ? 'Edit Profile' : 'Continue Setup'}
                      </Button>
                      {activeClient.mealPlan && (
                        <Button onClick={() => router.push('/meal-plan')}>
                          View Plan
                          <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#00263d]" />
                    Client Profiles
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Button variant="outline" onClick={() => setIsNewClientOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active">
                  <TabsList className="mb-4">
                    <TabsTrigger value="active">
                      Active ({activeClients.length})
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                      Archived ({archivedClients.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    {activeClients.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Create your first client profile to get started
                        </p>
                        <Button onClick={() => setIsNewClientOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Client
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className={activeClients.length > 6 ? 'h-[400px]' : ''}>
                        <div className="space-y-2">
                          {activeClients.map((client) => (
                            <div
                              key={client.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50",
                                activeClientId === client.id && "border-[#c19962] bg-[#c19962]/5"
                              )}
                              onClick={() => handleSelectClient(client.id)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded-full bg-[#00263d] text-white flex items-center justify-center font-semibold">
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium truncate">{client.name}</p>
                                    {activeClientId === client.id && (
                                      <Badge variant="outline" className="text-xs border-[#c19962] text-[#c19962]">
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {client.email || 'No email'}
                                    {client.userProfile?.weightLbs && ` • ${client.userProfile.weightLbs} lbs`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getProgressBadge(client)}
                                <p className="text-xs text-muted-foreground w-20 text-right">
                                  {formatDate(client.updatedAt)}
                                </p>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      const newName = prompt('Enter new client name:', `${client.name} (Copy)`);
                                      if (newName) {
                                        duplicateClient(client.id, newName);
                                      }
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => archiveClient(client.id)}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent value="archived">
                    {archivedClients.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No archived clients</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {archivedClients.map((client) => (
                            <div
                              key={client.id}
                              className="flex items-center justify-between p-3 rounded-lg border opacity-60"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold">
                                  {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{client.name}</p>
                                  <p className="text-sm text-muted-foreground">{client.email || 'No email'}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Permanently delete this client?')) {
                                    deleteClient(client.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tools & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setIsNewClientOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2 text-[#c19962]" />
                  Create New Client
                </Button>
                {activeClient && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => router.push('/setup')}
                    >
                      <Edit className="h-4 w-4 mr-2 text-blue-500" />
                      Edit {activeClient.name}
                    </Button>
                    {activeClient.mealPlan && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push('/meal-plan')}
                      >
                        <FileText className="h-4 w-4 mr-2 text-green-500" />
                        Export PDF
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tools */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nutrition Tools</CardTitle>
                <CardDescription>Quick access tools for client consultations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/tools/hydration" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-blue-50">
                    <Droplets className="h-4 w-4 mr-2 text-blue-600" />
                    Hydration Calculator
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                </Link>
                <Link href="/tools/day-planner" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-[#c19962]/10">
                    <Calendar className="h-4 w-4 mr-2 text-[#c19962]" />
                    Single Day Planner
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                </Link>
                <Link href="/tools/meal-planner" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-green-50">
                    <ChefHat className="h-4 w-4 mr-2 text-green-600" />
                    Single Meal Planner
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                </Link>
                <Link href="/tools/nutrition-analysis" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-purple-50">
                    <Beaker className="h-4 w-4 mr-2 text-purple-600" />
                    Nutrition Analysis
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Workflow Steps Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Planning Workflow</CardTitle>
                <CardDescription>5-step client plan process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { step: 1, title: 'Profile & Goals', path: '/setup' },
                    { step: 2, title: 'Weekly Schedule', path: '/schedule' },
                    { step: 3, title: 'Diet Preferences', path: '/preferences' },
                    { step: 4, title: 'Nutrition Targets', path: '/targets' },
                    { step: 5, title: 'Generate Plan', path: '/meal-plan' },
                  ].map((item) => (
                    <Link
                      key={item.step}
                      href={item.path}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-[#00263d] text-white flex items-center justify-center text-sm font-medium">
                        {item.step}
                      </div>
                      <span className="text-sm">{item.title}</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-40" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-[#00263d]">{activeClients.length}</p>
                    <p className="text-xs text-muted-foreground">Active Clients</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {clients.filter(c => c.mealPlan).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Plans Generated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Client Dialog */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client profile to start building their nutrition plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                placeholder="Enter client's full name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@email.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Any initial notes..."
                value={newClientNotes}
                onChange={(e) => setNewClientNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewClientOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient}
              disabled={!newClientName.trim()}
              className="bg-[#c19962] hover:bg-[#e4ac61] text-[#00263d]"
            >
              Create & Start Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/fitomicshorizontalgold.png"
              alt="Fitomics"
              width={100}
              height={33}
              className="h-8 w-auto opacity-60"
            />
            <Badge variant="outline" className="text-xs">
              Nutrition Planning OS v1.0
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Internal tool for precision nutrition planning
          </p>
        </div>
      </footer>
    </div>
  );
}
