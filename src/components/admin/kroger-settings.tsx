'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Check, Loader2, LogIn, LogOut, DollarSign } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';

export function KrogerSettings() {
  const { session } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markupType, setMarkupType] = useState<'percentage' | 'flat'>('percentage');
  const [markupValue, setMarkupValue] = useState('15');
  const [savingMarkup, setSavingMarkup] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  }), [session]);

  const checkStatus = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/kroger/admin/status', { headers: authHeaders() });
      const data = await res.json();
      setConnected(data.connected === true);
      if (data.markup) {
        setMarkupType(data.markup.markupType);
        setMarkupValue(String(data.markup.markupValue));
      }
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }, [session, authHeaders]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-detect return from OAuth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('kroger_connected')) {
        setConnected(true);
        setLoading(false);
        toast.success('Kroger account connected!');
        window.history.replaceState({}, '', window.location.pathname);
      }
      if (params.has('kroger_error')) {
        toast.error(`Kroger connection failed: ${params.get('kroger_error')}`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/kroger/admin/connect', { headers: authHeaders() });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/kroger/admin/disconnect', {
        method: 'POST',
        headers: authHeaders(),
      });
      setConnected(false);
      toast.info('Kroger disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleSaveMarkup = async () => {
    setSavingMarkup(true);
    try {
      const res = await fetch('/api/kroger/admin/markup', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ markupType, markupValue: parseFloat(markupValue) || 0 }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Markup settings saved');
    } catch {
      toast.error('Failed to save markup settings');
    }
    setSavingMarkup(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-blue-600" />
          Kroger Integration
        </CardTitle>
        <CardDescription>
          Connect your Kroger account to order groceries for clients. Items are added to your cart, you check out, and clients are billed with your markup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Kroger Account</span>
            {connected ? (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>
          {connected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <LogOut className="h-4 w-4 mr-1" /> Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700">
              <LogIn className="h-4 w-4 mr-1" /> Connect Kroger
            </Button>
          )}
        </div>

        {connected && (
          <>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client Billing Markup</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={markupType} onValueChange={(v) => setMarkupType(v as 'percentage' | 'flat')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Fee ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {markupType === 'percentage' ? 'Percentage' : 'Amount ($)'}
                  </Label>
                  <Input
                    type="number"
                    value={markupValue}
                    onChange={e => setMarkupValue(e.target.value)}
                    className="w-24"
                    min="0"
                    step={markupType === 'percentage' ? '1' : '0.01'}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveMarkup}
                  disabled={savingMarkup}
                >
                  {savingMarkup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {markupType === 'percentage'
                  ? `Clients will be charged the grocery cost + ${markupValue}% (e.g., $100 groceries → $${(100 * (1 + (parseFloat(markupValue) || 0) / 100)).toFixed(2)})`
                  : `Clients will be charged the grocery cost + $${parseFloat(markupValue || '0').toFixed(2)} flat fee`
                }
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
