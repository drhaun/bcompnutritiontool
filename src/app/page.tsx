'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  ArrowUpRight,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  Loader2,
  Link2,
  Unlink,
  Tag,
  RotateCcw,
  FolderCog,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { useFitomicsStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { ClientProfile, IntakeForm } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { 
    clients, 
    _deletedClientIds,
    activeClientId, 
    createClient, 
    selectClient, 
    deselectClient,
    deleteClient,
    archiveClient,
    duplicateClient,
    updateClient,
    getActiveClient,
    // Sync state
    isSyncing,
    lastSyncedAt,
    syncError,
    isAuthenticated,
    syncToDatabase,
    loadClientsFromDatabase,
  } = useFitomicsStore();
  
  // Filter out any clients we've deleted (defense-in-depth: never show deleted clients)
  const visibleClients = useMemo(() => {
    const deletedIds = new Set<string>([
      ...(_deletedClientIds || []),
      ...(typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('fitomics-deleted-client-ids') || '[]') 
        : []),
    ]);
    if (deletedIds.size === 0) return clients;
    return clients.filter(c => !deletedIds.has(c.id));
  }, [clients, _deletedClientIds]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  // Client submissions dialog
  interface ClientSubmission {
    id: string;
    clientId: string;
    groupName: string | null;
    formData: Record<string, unknown>;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    stripePaymentId: string | null;
  }
  const [submissionsDialogClient, setSubmissionsDialogClient] = useState<{ id: string; name: string } | null>(null);
  const [clientSubmissions, setClientSubmissions] = useState<ClientSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  const openClientSubmissions = useCallback(async (clientId: string, clientName: string) => {
    setSubmissionsDialogClient({ id: clientId, name: clientName });
    setClientSubmissions([]);
    setExpandedSubId(null);
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setClientSubmissions(data.submissions || []);
      }
    } catch { /* silent */ }
    setSubmissionsLoading(false);
  }, []);

  // Groups & client-group tags
  interface GroupInfo { id: string; name: string; slug: string; isActive: boolean; defaultFormId?: string | null }
  interface ClientTag { client_id: string; group_id: string; is_active: boolean }
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [clientTags, setClientTags] = useState<ClientTag[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Form picker for Send Intake Form
  const [availableForms, setAvailableForms] = useState<IntakeForm[]>([]);
  const [formPickerClient, setFormPickerClient] = useState<ClientProfile | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string>('');

  // Cronometer integration for new client dialog
  const [cronometerConnected, setCronometerConnected] = useState(false);
  const [cronometerClients, setCronometerClients] = useState<Array<{
    client_id: number;
    name: string;
    email?: string;
    status: string;
  }>>([]);
  const [selectedCronometerClient, setSelectedCronometerClient] = useState<{
    client_id: number;
    name: string;
    email?: string;
  } | null>(null);
  const [cronometerSearchQuery, setCronometerSearchQuery] = useState('');
  
  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
    // Debug logging to trace client persistence issues
    console.log('[HomePage] Hydration complete');
    console.log('[HomePage] Clients from store:', clients.length, clients.map(c => ({ id: c.id, name: c.name, status: c.status })));
  }, []);
  
  // Log when clients change
  useEffect(() => {
    if (isHydrated) {
      console.log('[HomePage] Clients updated:', clients.length, clients.map(c => ({ id: c.id, name: c.name, status: c.status })));
    }
  }, [clients, isHydrated]);
  
  // Fetch Cronometer status + client list on mount
  useEffect(() => {
    if (!isHydrated) return;
    let cancelled = false;
    const init = async () => {
      try {
        const statusRes = await fetch('/api/cronometer/status');
        if (!statusRes.ok || cancelled) return;
        const statusData = await statusRes.json();
        if (!statusData.connected) return;
        setCronometerConnected(true);

        const clientsRes = await fetch('/api/cronometer/clients');
        if (clientsRes.ok && !cancelled) {
          const data = await clientsRes.json();
          setCronometerClients(data.clients || []);
        }
      } catch {
        // non-fatal
      }
    };
    init();
    return () => { cancelled = true; };
  }, [isHydrated]);

  // Fetch groups and client-group tags
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups?active_only=true');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch { /* non-fatal */ }
  }, []);

  const fetchClientTags = useCallback(async () => {
    const ids = visibleClients.map(c => c.id).join(',');
    if (!ids) return;
    try {
      const res = await fetch(`/api/groups/tags?clientIds=${ids}`);
      if (res.ok) {
        const data = await res.json();
        setClientTags(data.tags || []);
      }
    } catch { /* non-fatal */ }
  }, [visibleClients]);

  const fetchAvailableForms = useCallback(async () => {
    try {
      const res = await fetch('/api/forms?active_only=true');
      if (res.ok) {
        const data = await res.json();
        setAvailableForms(data.forms || []);
      }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    fetchGroups();
    fetchAvailableForms();
  }, [isHydrated, fetchGroups, fetchAvailableForms]);

  useEffect(() => {
    if (!isHydrated || visibleClients.length === 0) return;
    fetchClientTags();
  }, [isHydrated, visibleClients, fetchClientTags]);

  const getClientGroups = useCallback((clientId: string): GroupInfo[] => {
    const groupIds = clientTags
      .filter(t => t.client_id === clientId && t.is_active)
      .map(t => t.group_id);
    return groups.filter(g => groupIds.includes(g.id));
  }, [clientTags, groups]);

  const tagClientToGroup = useCallback(async (clientId: string, groupId: string) => {
    try {
      await fetch('/api/groups/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, groupId }),
      });
      await fetchClientTags();
    } catch { /* non-fatal */ }
  }, [fetchClientTags]);

  const untagClientFromGroup = useCallback(async (clientId: string, groupId: string) => {
    try {
      await fetch('/api/groups/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, groupId }),
      });
      await fetchClientTags();
    } catch { /* non-fatal */ }
  }, [fetchClientTags]);

  // Filtered + sorted Cronometer clients for the dialog picker
  const filteredCronometerClients = useMemo(() => {
    const q = cronometerSearchQuery.toLowerCase().trim();
    return cronometerClients
      .filter(c => {
        if (!q) return true;
        return (c.name || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [cronometerClients, cronometerSearchQuery]);

  // Check if a Cronometer client is already linked to a Fitomics profile
  const getLinkedFitomicsClientName = useCallback((cronometerClientId: number): string | null => {
    const linked = visibleClients.find(c => c.cronometerClientId === cronometerClientId);
    return linked ? linked.name : null;
  }, [visibleClients]);

  const activeClient = getActiveClient();
  
  // Filter and sort clients (use visibleClients to exclude any deleted)
  // Note: clients without a status are treated as 'active' for backward compatibility
  const activeClients = useMemo(() => {
    const filtered = visibleClients
      .filter(c => !c.status || c.status === 'active')
      .filter(c => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.notes?.toLowerCase().includes(query)
        );
      })
      .filter(c => {
        if (selectedGroupFilter === 'all') return true;
        if (selectedGroupFilter === 'untagged') {
          return !clientTags.some(t => t.client_id === c.id && t.is_active);
        }
        return clientTags.some(t => t.client_id === c.id && t.group_id === selectedGroupFilter && t.is_active);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return filtered;
  }, [visibleClients, searchQuery, selectedGroupFilter, clientTags]);

  const archivedClients = visibleClients.filter(c => c.status === 'archived');
  
  const recentClients = activeClients.slice(0, 5);

  const handleCreateClient = () => {
    if (!newClientName.trim()) return;
    
    console.log('[HomePage] Creating new client:', newClientName.trim());
    const clientId = createClient(newClientName.trim(), newClientEmail.trim() || undefined, newClientNotes.trim() || undefined);
    console.log('[HomePage] Client created with ID:', clientId);
    
    // If a Cronometer client was selected, link it immediately
    if (selectedCronometerClient) {
      console.log('[HomePage] Linking Cronometer client:', selectedCronometerClient.client_id, selectedCronometerClient.name);
      updateClient(clientId, {
        cronometerClientId: selectedCronometerClient.client_id,
        cronometerClientName: selectedCronometerClient.name,
      });
    }
    
    setIsNewClientOpen(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientNotes('');
    setSelectedCronometerClient(null);
    setCronometerSearchQuery('');
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

  const generateIntakeLink = useCallback(async (client: ClientProfile, formId?: string) => {
    try {
      const res = await fetch(`/api/clients/${client.id}/generate-intake-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: formId || undefined }),
      });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        alert(`Intake form link copied to clipboard!\n\n${data.url}`);
      } else {
        alert(data.error || 'Failed to generate intake link.');
      }
    } catch {
      alert('Error generating intake link.');
    }
  }, []);

  const handleSendIntakeForm = useCallback((client: ClientProfile) => {
    if (availableForms.length === 0) {
      generateIntakeLink(client);
      return;
    }
    // If client has a group with a default form, use it directly
    const clientGroups = getClientGroups(client.id);
    const groupWithForm = clientGroups.find(g => {
      const fullGroup = groups.find(gg => gg.id === g.id);
      return fullGroup && fullGroup.defaultFormId;
    });
    if (groupWithForm) {
      generateIntakeLink(client);
      return;
    }
    // Show form picker
    setFormPickerClient(client);
    setSelectedFormId(availableForms[0]?.id || '');
  }, [availableForms, getClientGroups, groups, generateIntakeLink]);

  const handleFormPickerConfirm = useCallback(() => {
    if (!formPickerClient) return;
    generateIntakeLink(formPickerClient, selectedFormId || undefined);
    setFormPickerClient(null);
  }, [formPickerClient, selectedFormId, generateIntakeLink]);

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
                    <div className="flex items-center gap-2">
                      {getProgressBadge(activeClient)}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deselectClient()}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xl font-semibold">{activeClient.name}</p>
                        {getClientGroups(activeClient.id).map(g => (
                          <Badge key={g.id} variant="secondary" className="text-xs">
                            {g.name}
                          </Badge>
                        ))}
                      </div>
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
                    {groups.length > 0 && (
                      <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                        <SelectTrigger className="w-[160px]">
                          <Tag className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                          <SelectValue placeholder="All Groups" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Groups</SelectItem>
                          <SelectItem value="untagged">Untagged</SelectItem>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium truncate">{client.name}</p>
                                    {activeClientId === client.id && (
                                      <Badge variant="outline" className="text-xs border-[#c19962] text-[#c19962]">
                                        Active
                                      </Badge>
                                    )}
                                    {getClientGroups(client.id).map(g => (
                                      <Badge key={g.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {g.name}
                                      </Badge>
                                    ))}
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
                                <div onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      {groups.length > 0 && (
                                        <>
                                          {groups.map(g => {
                                            const isTagged = clientTags.some(t => t.client_id === client.id && t.group_id === g.id && t.is_active);
                                            return (
                                              <DropdownMenuItem
                                                key={g.id}
                                                onClick={() => isTagged ? untagClientFromGroup(client.id, g.id) : tagClientToGroup(client.id, g.id)}
                                              >
                                                <Tag className={cn("h-4 w-4 mr-2", isTagged ? "text-[#c19962]" : "text-muted-foreground")} />
                                                {isTagged ? `Remove from ${g.name}` : `Add to ${g.name}`}
                                                {isTagged && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-[#c19962]" />}
                                              </DropdownMenuItem>
                                            );
                                          })}
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                      <DropdownMenuItem onClick={() => router.push('/admin/groups')}>
                                        <FolderCog className="h-4 w-4 mr-2" />
                                        Manage Groups & Forms
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSendIntakeForm(client)}>
                                        <Link2 className="h-4 w-4 mr-2" />
                                        Send Intake Form
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openClientSubmissions(client.id, client.name)}>
                                        <ClipboardList className="h-4 w-4 mr-2" />
                                        View Submissions
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        const newName = prompt('Enter new client name:', `${client.name} (Copy)`);
                                        if (newName) duplicateClient(client.id, newName);
                                      }}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate Client
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-orange-600"
                                        onClick={() => {
                                          if (confirm(`Archive "${client.name}"? You can restore them later.`)) {
                                            archiveClient(client.id);
                                          }
                                        }}
                                      >
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive Client
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                          if (confirm(`Permanently delete "${client.name}"? This cannot be undone.`)) {
                                            deleteClient(client.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Client
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    updateClient(client.id, { status: 'active' } as Partial<ClientProfile>);
                                  }}
                                  title="Restore client"
                                >
                                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Permanently delete "${client.name}"? This cannot be undone.`)) {
                                      deleteClient(client.id);
                                    }
                                  }}
                                  title="Permanently delete"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/admin/groups')}
                >
                  <FolderCog className="h-4 w-4 mr-2 text-purple-500" />
                  Manage Groups & Forms
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
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => handleSendIntakeForm(activeClient)}
                    >
                      <Link2 className="h-4 w-4 mr-2 text-teal-500" />
                      Send Intake Form
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => openClientSubmissions(activeClient.id, activeClient.name)}
                    >
                      <ClipboardList className="h-4 w-4 mr-2 text-amber-500" />
                      View Submissions
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
                <Link href="/tools/body-composition" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-[#00263d]/10">
                    <Target className="h-4 w-4 mr-2 text-[#00263d]" />
                    Body Composition Calculator
                    <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
                  </Button>
                </Link>
                <Link href="/tools/cronometer-dashboard" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-orange-50">
                    <Activity className="h-4 w-4 mr-2 text-orange-600" />
                    Cronometer Dashboard
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
                <Link href="/tools/meal-planner" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-green-50">
                    <ChefHat className="h-4 w-4 mr-2 text-green-600" />
                    Single Meal Planner
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
                <Link href="/tools/hydration" className="block">
                  <Button variant="ghost" className="w-full justify-start hover:bg-blue-50">
                    <Droplets className="h-4 w-4 mr-2 text-blue-600" />
                    Hydration Calculator
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
                      {visibleClients.filter(c => c.mealPlan).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Plans Generated</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card className={syncError ? 'border-red-200' : isAuthenticated ? 'border-green-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isAuthenticated ? (
                      <Cloud className="h-4 w-4 text-green-600" />
                    ) : (
                      <CloudOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    Cloud Sync
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">Connected to Supabase</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {visibleClients.length} client{visibleClients.length !== 1 ? 's' : ''} in local storage
                    </p>
                    {lastSyncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                    {syncError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                        Sync error: {syncError}
                      </div>
                    )}
                    
                    {/* Manual Sync Button */}
                    <Button
                      variant={visibleClients.length > 0 ? "default" : "outline"}
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => syncToDatabase()}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Sync {visibleClients.length > 0 ? `${visibleClients.length} Client${visibleClients.length !== 1 ? 's' : ''} to Cloud` : 'with Cloud'}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Client data is stored locally in your browser.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sign in to sync across devices and save to the cloud.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Client Dialog */}
      <Dialog open={isNewClientOpen} onOpenChange={(open) => {
        setIsNewClientOpen(open);
        if (!open) {
          setSelectedCronometerClient(null);
          setCronometerSearchQuery('');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client profile to start building their nutrition plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Cronometer Quick-Link Section */}
            {cronometerConnected && cronometerClients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-[#c19962]" />
                  Link Cronometer Client (Optional)
                </Label>
                {selectedCronometerClient ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <Link2 className="h-3.5 w-3.5" />
                      <span><strong>{selectedCronometerClient.name}</strong></span>
                      {selectedCronometerClient.email && (
                        <span className="text-xs text-green-600/70 dark:text-green-400/70">{selectedCronometerClient.email}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCronometerClient(null)}
                      className="text-green-600 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search Cronometer clients..."
                      value={cronometerSearchQuery}
                      onChange={(e) => setCronometerSearchQuery(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <div className="max-h-36 overflow-y-auto border rounded-lg divide-y">
                      {filteredCronometerClients.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          {cronometerSearchQuery ? 'No matches' : 'No Cronometer clients'}
                        </p>
                      ) : (
                        filteredCronometerClients.map(c => {
                          const linkedTo = getLinkedFitomicsClientName(c.client_id);
                          return (
                            <button
                              key={c.client_id}
                              type="button"
                              onClick={() => {
                                setSelectedCronometerClient({
                                  client_id: c.client_id,
                                  name: c.name,
                                  email: c.email,
                                });
                                // Auto-fill name and email if empty
                                if (!newClientName.trim()) setNewClientName(c.name);
                                if (!newClientEmail.trim() && c.email) setNewClientEmail(c.email);
                                setCronometerSearchQuery('');
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors",
                                linkedTo
                                  ? "opacity-50 hover:bg-muted/50"
                                  : "hover:bg-[#c19962]/10"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{c.name}</span>
                                {c.email && <span className="text-xs text-muted-foreground truncate">{c.email}</span>}
                              </div>
                              {linkedTo && (
                                <Badge variant="outline" className="text-xs shrink-0 ml-2">Linked to {linkedTo}</Badge>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
                <Separator />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                placeholder="Enter client's full name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                autoFocus={!cronometerConnected || cronometerClients.length === 0}
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
              {selectedCronometerClient ? 'Create & Link' : 'Create & Start Setup'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Picker Dialog */}
      <Dialog open={!!formPickerClient} onOpenChange={(open) => { if (!open) setFormPickerClient(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#c19962]" />
              Send Intake Form
            </DialogTitle>
            <DialogDescription>
              Choose which form to send to {formPickerClient?.name || 'this client'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {availableForms.length > 0 ? (
              <div className="space-y-2">
                {availableForms.map(f => (
                  <button key={f.id} onClick={() => setSelectedFormId(f.id)}
                    className={cn('w-full text-left p-3 rounded-lg border transition-colors',
                      selectedFormId === f.id ? 'border-[#c19962] bg-[#c19962]/5' : 'border-gray-200 hover:border-[#c19962]/50')}>
                    <p className="text-sm font-medium">{f.name}</p>
                    {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1 font-mono">/intake/{f.slug}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No forms available. Create one in Groups &amp; Forms.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormPickerClient(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => { if (formPickerClient) { generateIntakeLink(formPickerClient); setFormPickerClient(null); } }}>
              Send without form
            </Button>
            <Button onClick={handleFormPickerConfirm} disabled={!selectedFormId}
              className="bg-[#c19962] hover:bg-[#a8833e] text-[#00263d]">
              Generate Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Submissions Dialog */}
      <Dialog open={!!submissionsDialogClient} onOpenChange={(open) => { if (!open) setSubmissionsDialogClient(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#c19962]" />
              Form Submissions — {submissionsDialogClient?.name}
            </DialogTitle>
            <DialogDescription>
              All intake form entries for this client, newest first.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {submissionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#c19962]" />
              </div>
            ) : clientSubmissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No submissions yet</p>
                <p className="text-sm mt-1">This client hasn&apos;t completed any intake forms.</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {clientSubmissions.map(sub => {
                  const isExpanded = expandedSubId === sub.id;
                  const isPaid = !!sub.stripePaymentId;
                  const fd = sub.formData || {};
                  const up = ((fd as Record<string, unknown>).userProfile || {}) as Record<string, unknown>;
                  const dp = (fd as Record<string, unknown>).dietPreferences as Record<string, unknown> | undefined;
                  const ca = (fd as Record<string, unknown>).customAnswers as Record<string, unknown> | undefined;
                  const str = (v: unknown): string => String(v ?? '');
                  const statusColors: Record<string, string> = {
                    submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    reviewed: 'bg-green-100 text-green-800 border-green-200',
                    archived: 'bg-gray-100 text-gray-600 border-gray-200',
                  };

                  return (
                    <div key={sub.id} className="rounded-lg border overflow-hidden">
                      <button
                        onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00263d]/10 flex items-center justify-center">
                            <FileText className="h-3.5 w-3.5 text-[#00263d]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {sub.groupName || 'Direct Submission'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {' · '}{new Date(sub.submittedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isPaid && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-medium text-green-700">
                              <DollarSign className="h-3 w-3" /> Paid
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[sub.status] || ''}`}>
                            {sub.status}
                          </Badge>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t p-4 space-y-3 bg-muted/30">
                          {/* Profile snapshot */}
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profile at Submission</h4>
                            <div className="rounded-lg border bg-background p-3 space-y-1 text-xs">
                              {up.name && <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{str(up.name)}</span></div>}
                              {up.heightFt && <div className="flex justify-between"><span className="text-muted-foreground">Height</span><span>{str(up.heightFt)}&apos;{str(up.heightIn || 0)}&quot;</span></div>}
                              {(up.weightLbs || up.weight) && <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span>{str(up.weightLbs || up.weight)} lbs</span></div>}
                              {up.bodyFatPercentage && <div className="flex justify-between"><span className="text-muted-foreground">Body Fat</span><span>{str(up.bodyFatPercentage)}%</span></div>}
                              {up.goalType && <div className="flex justify-between"><span className="text-muted-foreground">Goal</span><span className="capitalize">{str(up.goalType).replace(/_/g, ' ')}</span></div>}
                              {up.goalWeight && <div className="flex justify-between"><span className="text-muted-foreground">Goal Weight</span><span>{str(up.goalWeight)} lbs</span></div>}
                              {up.goalBodyFatPercent && <div className="flex justify-between"><span className="text-muted-foreground">Goal BF%</span><span>{str(up.goalBodyFatPercent)}%</span></div>}
                              {up.goalFatMass && <div className="flex justify-between"><span className="text-muted-foreground">Goal Fat Mass</span><span>{str(up.goalFatMass)} lbs</span></div>}
                              {up.goalFFM && <div className="flex justify-between"><span className="text-muted-foreground">Goal FFM</span><span>{str(up.goalFFM)} lbs</span></div>}
                              {up.rateOfChange && <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span>{str(up.rateOfChange)}%/wk</span></div>}
                            </div>
                          </div>

                          {/* Diet preferences */}
                          {dp && Object.keys(dp).filter(k => k !== '_dataSource').length > 0 && (
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diet Preferences</h4>
                              <div className="rounded-lg border bg-background p-3 text-xs space-y-0.5">
                                {Object.entries(dp).filter(([k]) => k !== '_dataSource').slice(0, 10).map(([k, v]) => (
                                  <div key={k} className="flex justify-between py-0.5">
                                    <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="max-w-[55%] text-right truncate">{Array.isArray(v) ? (v as string[]).join(', ') : String(v ?? '')}</span>
                                  </div>
                                ))}
                                {Object.keys(dp).filter(k => k !== '_dataSource').length > 10 && (
                                  <p className="text-muted-foreground pt-1">+ {Object.keys(dp).filter(k => k !== '_dataSource').length - 10} more fields</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Custom answers */}
                          {ca && Object.keys(ca).length > 0 && (
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Additional Responses</h4>
                              <div className="rounded-lg border bg-background p-3 text-xs space-y-0.5">
                                {Object.entries(ca).map(([k, v]) => (
                                  <div key={k} className="flex justify-between py-0.5">
                                    <span className="text-muted-foreground">{k}</span>
                                    <span className="max-w-[55%] text-right">{Array.isArray(v) ? (v as string[]).join(', ') : String(v ?? '')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Raw data */}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View raw data</summary>
                            <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-48 text-[10px]">{JSON.stringify(fd, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
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
