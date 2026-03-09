import type { FormPricingConfig, ResolvedFormPricing, ResolvedPricingLineItem, TieredPricingRule } from '@/types';
export { getFormCustomFields, getNumberCustomFields } from '@/lib/form-fields';

type PriceLookup = Record<string, { unitAmount: number | null; currency: string | null; nickname?: string | null }>;

function parseNumericAnswer(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getConfiguredPlayerCount(config: FormPricingConfig | null, customAnswers: Record<string, unknown>): number | null {
  if (!config || !('playerCountFieldId' in config) || !config.playerCountFieldId) return null;
  return parseNumericAnswer(customAnswers[config.playerCountFieldId]);
}

export function normalizePricingConfig(raw: unknown, legacyStripePriceId?: string | null): FormPricingConfig | null {
  if (raw && typeof raw === 'object' && 'mode' in (raw as Record<string, unknown>)) {
    const config = { ...(raw as Record<string, unknown>) } as FormPricingConfig;
    if (!legacyStripePriceId) return config;
    switch (config.mode) {
      case 'fixed':
        return {
          ...config,
          fixedPriceId: config.fixedPriceId || legacyStripePriceId,
        };
      case 'per_player':
        return {
          ...config,
          perPlayerPriceId: config.perPlayerPriceId || legacyStripePriceId,
        };
      case 'base_plus_per_player':
        return {
          ...config,
          basePriceId: config.basePriceId || legacyStripePriceId,
          perPlayerPriceId: config.perPlayerPriceId || legacyStripePriceId,
        };
      case 'tiered':
        return {
          ...config,
          tiers: config.tiers.map(tier => ({
            ...tier,
            flatPriceId: tier.flatPriceId || legacyStripePriceId,
          })),
        };
      case 'manual_quote':
      default:
        return config;
    }
  }
  if (legacyStripePriceId) {
    return {
      mode: 'fixed',
      fixedPriceId: legacyStripePriceId,
    };
  }
  return null;
}

function formatCurrency(cents: number | null, currency: string | null) {
  if (cents == null || !currency) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function summarizeLineItems(lineItems: ResolvedPricingLineItem[], priceLookup: PriceLookup): string[] {
  return lineItems.map(item => {
    const price = priceLookup[item.priceId];
    const amount = formatCurrency(price?.unitAmount ?? null, price?.currency ?? null);
    return amount ? `${item.label}: ${amount} x ${item.quantity}` : `${item.label}: quantity ${item.quantity}`;
  });
}

function resolveTier(tiers: TieredPricingRule[], playerCount: number): TieredPricingRule | null {
  return tiers.find(tier => playerCount >= tier.minPlayers && (tier.maxPlayers == null || playerCount <= tier.maxPlayers)) || null;
}

export function resolveFormPricing(config: FormPricingConfig | null, customAnswers: Record<string, unknown>, priceLookup: PriceLookup): ResolvedFormPricing {
  if (!config) {
    return {
      mode: 'manual_quote',
      requiresCheckout: false,
      playerCount: null,
      lineItems: [],
      totalAmountCents: null,
      currency: null,
      summaryLines: [],
      message: 'Payment is not configured for this form.',
    };
  }

  const base: Omit<ResolvedFormPricing, 'mode' | 'requiresCheckout' | 'lineItems' | 'summaryLines'> = {
    playerCount: null,
    totalAmountCents: null,
    currency: null,
  };

  if (config.mode === 'manual_quote') {
    const playerCount = config.playerCountFieldId ? parseNumericAnswer(customAnswers[config.playerCountFieldId]) : null;
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount,
      message: config.message || 'A coach will receive a manual quote before payment is collected.',
    };
  }

  if ('playerCountFieldId' in config && !config.playerCountFieldId) {
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount: null,
      message: 'Select a number field for player count before using this pricing mode.',
    };
  }

  if (config.mode === 'fixed' && !config.fixedPriceId) {
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount: null,
      message: 'Select a Stripe price to calculate checkout.',
    };
  }

  if (config.mode === 'per_player' && !config.perPlayerPriceId) {
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount: null,
      message: 'Select a per-player Stripe price to calculate checkout.',
    };
  }

  if (config.mode === 'base_plus_per_player' && (!config.basePriceId || !config.perPlayerPriceId)) {
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount: null,
      message: 'Select both a base Stripe price and a per-player Stripe price.',
    };
  }

  if (config.mode === 'tiered' && config.tiers.some(tier => !tier.flatPriceId)) {
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount: null,
      message: 'Select a Stripe price for each pricing tier.',
    };
  }

  const playerCount = 'playerCountFieldId' in config ? parseNumericAnswer(customAnswers[config.playerCountFieldId]) : null;

  if (('playerCountFieldId' in config) && (!playerCount || playerCount < 1)) {
    return {
      ...base,
      mode: config.mode,
      requiresCheckout: false,
      lineItems: [],
      summaryLines: [],
      playerCount,
      message: 'Enter the number of players to calculate pricing.',
    };
  }

  let lineItems: ResolvedPricingLineItem[] = [];
  let selectedTierId: string | undefined;

  switch (config.mode) {
    case 'fixed':
      lineItems = [{ priceId: config.fixedPriceId, quantity: 1, label: 'Program fee' }];
      break;
    case 'per_player':
      lineItems = [{ priceId: config.perPlayerPriceId, quantity: playerCount || 0, label: 'Player fee' }];
      break;
    case 'base_plus_per_player':
      lineItems = [
        { priceId: config.basePriceId, quantity: 1, label: 'Base fee' },
        { priceId: config.perPlayerPriceId, quantity: playerCount || 0, label: 'Player fee' },
      ];
      break;
    case 'tiered': {
      const tier = resolveTier(config.tiers, playerCount || 0);
      if (!tier) {
        return {
          ...base,
          mode: config.mode,
          requiresCheckout: false,
          lineItems: [],
          summaryLines: [],
          playerCount,
          message: 'No pricing tier matches that player count.',
        };
      }
      selectedTierId = tier.id;
      lineItems = [{ priceId: tier.flatPriceId, quantity: 1, label: tier.label || `${tier.minPlayers}-${tier.maxPlayers ?? '+'} players` }];
      break;
    }
    default:
      lineItems = [];
  }

  const prices = lineItems.map(item => priceLookup[item.priceId]).filter(Boolean);
  const currency = prices[0]?.currency || null;
  const totalAmountCents = lineItems.reduce((total, item) => {
    const unit = priceLookup[item.priceId]?.unitAmount;
    return total + ((unit || 0) * item.quantity);
  }, 0);

  return {
    ...base,
    mode: config.mode,
    requiresCheckout: lineItems.length > 0,
    lineItems,
    summaryLines: summarizeLineItems(lineItems, priceLookup),
    playerCount,
    currency,
    totalAmountCents,
    selectedTierId,
  };
}
