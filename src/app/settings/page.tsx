'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useFitomicsStore } from '@/lib/store';
import { 
  Settings, 
  Link2, 
  Unlink, 
  Users, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  Activity,
  UserCircle,
  ArrowRight
} from 'lucide-react';

interface CronometerClient {
  client_id: number;
  name: string;
  email?: string;
  status: 'EXTERNAL_CLIENT' | 'EXTERNAL_CLIENT_PENDING' | 'INTERNAL_CLIENT';
  last_activity?: string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { clients: fitomicsClients, updateClient } = useFitomicsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [cronometerStatus, setCronometerStatus] = useState<{
    configured: boolean;
    connected: boolean;
    userId: string | null;
  } | null>(null);
  const [clients, setClients] = useState<CronometerClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [linkingClientId, setLinkingClientId] = useState<number | null>(null);
  const [selectedFitomicsClient, setSelectedFitomicsClient] = useState<string>('');

  // Get active Fitomics clients
  const activeFitomicsClients = fitomicsClients.filter(c => c.status === 'active');

  // Get linked Fitomics client for a Cronometer client
  const getLinkedFitomicsClient = (cronometerClientId: number) => {
    return fitomicsClients.find(c => c.cronometerClientId === cronometerClientId);
  };

  // Link a Cronometer client to a Fitomics client
  const linkClient = (cronometerClient: CronometerClient, fitomicsClientId: string) => {
    if (!fitomicsClientId) return;
    
    const fitomicsClient = fitomicsClients.find(c => c.id === fitomicsClientId);
    if (!fitomicsClient) return;
    
    updateClient(fitomicsClientId, {
      cronometerClientId: cronometerClient.client_id,
      cronometerClientName: cronometerClient.name,
    });
    
    toast.success(`Linked ${cronometerClient.name} to ${fitomicsClient.name}`);
    setLinkingClientId(null);
    setSelectedFitomicsClient('');
  };

  // Unlink a Cronometer client
  const unlinkClient = (cronometerClientId: number) => {
    const fitomicsClient = getLinkedFitomicsClient(cronometerClientId);
    if (fitomicsClient) {
      updateClient(fitomicsClient.id, {
        cronometerClientId: undefined,
        cronometerClientName: undefined,
      });
      toast.success(`Unlinked ${fitomicsClient.name} from Cronometer`);
    }
  };

  // Check for OAuth callback messages
  useEffect(() => {
    const connected = searchParams.get('cronometer_connected');
    const error = searchParams.get('cronometer_error');
    
    if (connected === 'true') {
      toast.success('Successfully connected to Cronometer!');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'no_code': 'Authorization failed - no code received',
        'state_mismatch': 'Security check failed - please try again',
        'token_exchange_failed': 'Failed to complete authorization',
      };
      toast.error(errorMessages[error] || `Cronometer error: ${error}`);
    }
  }, [searchParams]);

  // Check Cronometer status on load
  useEffect(() => {
    checkCronometerStatus();
  }, []);

  const checkCronometerStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cronometer/status');
      const data = await response.json();
      setCronometerStatus(data);
      
      // If connected, fetch clients
      if (data.connected) {
        fetchClients();
      }
    } catch (error) {
      console.error('Failed to check Cronometer status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const response = await fetch('/api/cronometer/clients');
      const data = await response.json();
      setClients(data.clients || []);
      
      // Check if token expired
      if (data.tokenExpired) {
        toast.error('Your Cronometer session has expired. Click "Reconnect" to re-authenticate.');
      } else if (data.error && !data.tokenExpired) {
        toast.warning(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to fetch Cronometer clients');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const connectCronometer = () => {
    // Redirect to OAuth authorization
    window.location.href = '/api/cronometer/authorize';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXTERNAL_CLIENT':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'EXTERNAL_CLIENT_PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-400">Pending</Badge>;
      case 'INTERNAL_CLIENT':
        return <Badge variant="secondary">Internal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-[#c19962]" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage integrations and application settings
          </p>
        </div>

        {/* Cronometer Integration */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Cronometer Integration
                </CardTitle>
                <CardDescription>
                  Connect your Cronometer Pro account to import client nutrition data
                </CardDescription>
              </div>
              {cronometerStatus?.connected ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cronometerStatus?.configured && (
              <Alert>
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                  Cronometer API credentials are not configured. Add CRONOMETER_CLIENT_ID and 
                  CRONOMETER_CLIENT_SECRET to your environment variables.
                </AlertDescription>
              </Alert>
            )}

            {cronometerStatus?.configured && !cronometerStatus?.connected && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Connect your Cronometer Pro account</p>
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to Cronometer to authorize access
                  </p>
                </div>
                <Button onClick={connectCronometer}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect Cronometer
                </Button>
              </div>
            )}

            {cronometerStatus?.connected && (
              <>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">Connected to Cronometer</p>
                    <p className="text-sm text-green-600">
                      User ID: {cronometerStatus.userId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchClients} disabled={isLoadingClients}>
                      {isLoadingClients ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={connectCronometer}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Reconnect
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Clients List */}
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4" />
                    Cronometer Clients ({clients.length})
                  </h3>
                  
                  {clients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No clients found in your Cronometer Pro account</p>
                      <p className="text-sm">Invite clients from the Cronometer dashboard</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {clients.map((client) => {
                          const linkedClient = getLinkedFitomicsClient(client.client_id);
                          const isLinking = linkingClientId === client.client_id;
                          
                          return (
                            <div 
                              key={client.client_id}
                              className={`p-3 border rounded-lg ${linkedClient ? 'border-green-200 bg-green-50/50' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{client.name}</p>
                                    {getStatusBadge(client.status)}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {client.email && <span>{client.email}</span>}
                                    <span className="text-xs">ID: {client.client_id}</span>
                                  </div>
                                </div>
                                
                                {linkedClient ? (
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <div className="flex items-center gap-1 text-sm text-green-700">
                                        <Link2 className="h-3 w-3" />
                                        <span>Linked to</span>
                                      </div>
                                      <p className="font-medium text-green-800">{linkedClient.name}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => unlinkClient(client.client_id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Unlink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : isLinking ? (
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={selectedFitomicsClient}
                                      onValueChange={setSelectedFitomicsClient}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select client..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {activeFitomicsClients
                                          .filter(c => !c.cronometerClientId)
                                          .map((fc) => (
                                            <SelectItem key={fc.id} value={fc.id}>
                                              <div className="flex items-center gap-2">
                                                <UserCircle className="h-3 w-3" />
                                                {fc.name}
                                              </div>
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      onClick={() => linkClient(client, selectedFitomicsClient)}
                                      disabled={!selectedFitomicsClient}
                                    >
                                      Link
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setLinkingClientId(null);
                                        setSelectedFitomicsClient('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLinkingClientId(client.client_id)}
                                    disabled={activeFitomicsClients.filter(c => !c.cronometerClientId).length === 0}
                                  >
                                    <Link2 className="h-4 w-4 mr-1" />
                                    Link to Fitomics
                                  </Button>
                                )}
                              </div>
                              
                              {client.last_activity && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                                  <Calendar className="h-3 w-3" />
                                  Last active: {client.last_activity}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* External Links */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <a href="https://cronometer.com/developer" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Cronometer Developer Portal
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://cronometer.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Cronometer Dashboard
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
