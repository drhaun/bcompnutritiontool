'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Pill,
  ExternalLink,
  ShoppingBag,
  Sun,
  Moon,
  Zap,
  Target,
  Utensils,
  Dumbbell,
  Clock,
  ArrowLeft,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useFitomicsStore } from '@/lib/store';
import { FullscriptEmbed, getFullscriptUrl } from '@/components/fullscript/fullscript-embed';
import type { SupplementEntry, SupplementTiming } from '@/types';

const TIMING_CONFIG: Record<SupplementTiming, { label: string; icon: typeof Sun; color: string }> = {
  morning: { label: 'Morning', icon: Sun, color: 'text-amber-600' },
  pre_workout: { label: 'Pre-Workout', icon: Zap, color: 'text-orange-600' },
  intra_workout: { label: 'Intra-Workout', icon: Dumbbell, color: 'text-red-600' },
  post_workout: { label: 'Post-Workout', icon: Target, color: 'text-green-600' },
  with_meals: { label: 'With Meals', icon: Utensils, color: 'text-blue-600' },
  before_bed: { label: 'Before Bed', icon: Moon, color: 'text-indigo-600' },
  as_needed: { label: 'As Needed', icon: Clock, color: 'text-gray-600' },
};

export default function FullscriptPage() {
  const { getActiveClient, userProfile } = useFitomicsStore();
  const activeClient = getActiveClient();

  const supplements: SupplementEntry[] = useMemo(() => {
    return activeClient?.userProfile?.supplements || userProfile?.supplements || [];
  }, [activeClient, userProfile]);

  const clientName = activeClient?.userProfile?.name || activeClient?.name || userProfile?.name;
  const clientEmail = activeClient?.email;

  const groupedByTiming = useMemo(() => {
    const groups: Record<string, SupplementEntry[]> = {};
    for (const supp of supplements) {
      for (const t of supp.timing) {
        if (!groups[t]) groups[t] = [];
        groups[t].push(supp);
      }
    }
    return groups;
  }, [supplements]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/meal-plan">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#00263d] flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-emerald-600" />
              Fullscript Dispensary
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse and order professional-grade supplements
              {clientName && (
                <> for <span className="font-medium text-foreground">{clientName}</span></>
              )}
            </p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => window.open(getFullscriptUrl(), '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Practitioner Catalog
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Supplement Schedule */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-emerald-600" />
                Supplement Schedule
              </CardTitle>
              <CardDescription>
                {supplements.length > 0
                  ? `${supplements.length} active supplement${supplements.length > 1 ? 's' : ''}`
                  : 'No supplements configured for this client'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplements.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add supplements in the client&apos;s profile setup to see them here.
                </p>
              )}

              {Object.entries(groupedByTiming).map(([timing, supps]) => {
                const config = TIMING_CONFIG[timing as SupplementTiming];
                if (!config) return null;
                const Icon = config.icon;

                return (
                  <div key={timing} className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">
                        {supps.length}
                      </Badge>
                    </div>
                    <div className="space-y-1 ml-5">
                      {supps.map((supp) => (
                        <div
                          key={`${timing}-${supp.name}`}
                          className="flex items-center justify-between p-2 rounded-md border hover:bg-emerald-50/50 transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium block truncate">{supp.name}</span>
                            {supp.dosage && (
                              <span className="text-xs text-muted-foreground">{supp.dosage}</span>
                            )}
                            {supp.notes && (
                              <span className="text-xs text-muted-foreground block mt-0.5 truncate">
                                {supp.notes}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 flex-shrink-0 transition-opacity"
                            onClick={() =>
                              window.open(getFullscriptUrl(supp.name), '_blank')
                            }
                          >
                            <Search className="h-3 w-3 mr-1" />
                            Find
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right — Fullscript Embed or Dispensary Links */}
        <div className="lg:col-span-2">
          <FullscriptEmbed
            supplements={supplements}
            clientName={clientName}
            clientEmail={clientEmail}
          />
        </div>
      </div>
    </div>
  );
}
