'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, ExternalLink, Loader2, ShoppingBag, AlertCircle, Search } from 'lucide-react';
import type { SupplementEntry } from '@/types';

const DISPENSARY_URL =
  process.env.NEXT_PUBLIC_FULLSCRIPT_DISPENSARY_URL ||
  'https://us.fullscript.com/welcome/fitomics';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_FULLSCRIPT_PUBLIC_KEY || '';
const FS_ENV = (process.env.NEXT_PUBLIC_FULLSCRIPT_ENV || 'us-snd') as
  | 'us'
  | 'ca'
  | 'us-snd'
  | 'ca-snd';

function buildSearchUrl(supplementName: string) {
  const base = DISPENSARY_URL.replace(/\/$/, '');
  return `${base}?search=${encodeURIComponent(supplementName)}`;
}

interface FullscriptEmbedProps {
  compact?: boolean;
  supplements?: SupplementEntry[];
  clientName?: string;
  clientEmail?: string;
  /** Called when a treatment plan is activated inside the embed */
  onTreatmentPlanActivated?: (plan: unknown) => void;
  /** Called when a patient is selected/created inside the embed */
  onPatientSelected?: (patient: { id: string; firstName: string; lastName: string }) => void;
}

export function FullscriptEmbed({
  compact = false,
  supplements = [],
  clientName,
  clientEmail,
  onTreatmentPlanActivated,
  onPatientSelected,
}: FullscriptEmbedProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const featureRef = useRef<unknown>(null);
  const [embedState, setEmbedState] = useState<'loading' | 'mounted' | 'fallback'>('loading');
  const [error, setError] = useState<string | null>(null);

  const initEmbed = useCallback(async () => {
    // No public key → skip SDK entirely, use dispensary links
    if (!PUBLIC_KEY) {
      setEmbedState('fallback');
      return;
    }

    try {
      const res = await fetch('/api/fullscript/session-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientEmail }),
      });

      if (!res.ok) {
        setEmbedState('fallback');
        return;
      }

      const { secretToken } = await res.json();
      if (!secretToken) {
        setEmbedState('fallback');
        return;
      }

      if (!mountRef.current) {
        setEmbedState('fallback');
        return;
      }

      const { Fullscript } = await import('@fullscript/fullscript-js');
      const client = Fullscript({ publicKey: PUBLIC_KEY, env: FS_ENV });

      const patientData: Record<string, string> = {};
      if (clientName) {
        const parts = clientName.trim().split(/\s+/);
        patientData.firstName = parts[0] || '';
        patientData.lastName = parts.slice(1).join(' ') || '';
      }
      if (clientEmail) {
        patientData.email = clientEmail;
      }

      const feature = client.create('platform', {
        secretToken,
        ...(Object.keys(patientData).length > 0 ? { patient: patientData } : {}),
        entrypoint: 'catalog',
      });

      // Listen for events from the embed
      // See https://fullscript.dev/docs/how-to-guides/fullscript-embed/reference/events
      if (typeof feature.on === 'function') {
        feature.on('patient.selected', (data: unknown) => {
          onPatientSelected?.(data as { id: string; firstName: string; lastName: string });
        });
        feature.on('treatmentPlan.activated', (data: unknown) => {
          onTreatmentPlanActivated?.(data);
        });
      }

      featureRef.current = feature;
      feature.mount(mountRef.current.id);
      setEmbedState('mounted');
    } catch (err) {
      console.warn('[Fullscript] Embed init failed, using fallback:', err);
      setEmbedState('fallback');
    }
  }, [clientName, clientEmail, onTreatmentPlanActivated, onPatientSelected]);

  useEffect(() => {
    initEmbed();
    return () => {
      if (featureRef.current && typeof (featureRef.current as { unmount?: () => void }).unmount === 'function') {
        (featureRef.current as { unmount: () => void }).unmount();
      }
    };
  }, [initEmbed]);

  // The mount-point div must always be in the DOM so the SDK can find it.
  // We toggle its visibility based on state.
  return (
    <div className="space-y-4">
      {/* SDK mount point — always present, shown only when mounted */}
      <div
        ref={mountRef}
        id="fullscript-embed-container"
        style={{
          width: '100%',
          height: embedState === 'mounted' ? (compact ? '500px' : 'calc(100vh - 200px)') : '0px',
          minHeight: embedState === 'mounted' ? (compact ? '400px' : '600px') : '0px',
          overflow: embedState === 'mounted' ? 'auto' : 'hidden',
        }}
      />

      {/* Loading state */}
      {embedState === 'loading' && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading Fullscript...</span>
        </div>
      )}

      {/* Fallback UI — rich dispensary links + supplement shopping */}
      {embedState === 'fallback' && (
        <>
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900">Fullscript Dispensary</h3>
                    <p className="text-xs text-emerald-700">
                      Browse professional-grade supplements with practitioner discounts
                    </p>
                  </div>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => window.open(DISPENSARY_URL, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Dispensary
                </Button>
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {supplements.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="h-4 w-4 text-emerald-600" />
                  Shop Client Supplements
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {supplements.length} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {supplements.map((supp) => (
                    <div
                      key={supp.name}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-emerald-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Pill className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{supp.name}</span>
                          {supp.dosage && (
                            <span className="text-xs text-muted-foreground">{supp.dosage}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 flex-shrink-0"
                        onClick={() => window.open(buildSearchUrl(supp.name), '_blank')}
                      >
                        <Search className="h-3.5 w-3.5 mr-1" />
                        Find
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/** Standalone supplement link button for use in meal slot cards or anywhere */
export function FullscriptSupplementLink({ name }: { name: string }) {
  return (
    <button
      type="button"
      onClick={() => window.open(buildSearchUrl(name), '_blank')}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
      title={`Find ${name} on Fullscript`}
    >
      <ShoppingBag className="h-2.5 w-2.5" />
      Fullscript
    </button>
  );
}

/** Returns the Fullscript dispensary URL, optionally with a search query */
export function getFullscriptUrl(searchQuery?: string) {
  if (searchQuery) {
    return buildSearchUrl(searchQuery);
  }
  return DISPENSARY_URL;
}
