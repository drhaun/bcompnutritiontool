import { NextRequest, NextResponse } from 'next/server';
import { getServiceToken, krogerGet } from '@/lib/kroger-client';
import { requireStaffSession } from '@/lib/api-auth';

interface KrogerProduct {
  productId: string;
  upc: string;
  description: string;
  brand: string;
  images: { perspective: string; sizes: { size: string; url: string }[] }[];
  items: { price?: { regular: number; promo: number }; size: string }[];
  categories: string[];
}

interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  category: string;
}

function getImageUrl(product: KrogerProduct): string | null {
  const front = product.images?.find(i => i.perspective === 'front');
  const img = front || product.images?.[0];
  if (!img?.sizes) return null;
  const medium = img.sizes.find(s => s.size === 'medium') || img.sizes.find(s => s.size === 'small') || img.sizes[0];
  return medium?.url || null;
}

function getPrice(product: KrogerProduct): number | null {
  const item = product.items?.[0];
  if (!item?.price) return null;
  return item.price.promo || item.price.regular || null;
}

const USDA_NOISE = new Set([
  'raw', 'cooked', 'boiled', 'baked', 'roasted', 'grilled', 'fried',
  'fresh', 'frozen', 'canned', 'dried', 'dry', 'dehydrated',
  'whole', 'sliced', 'diced', 'chopped', 'minced', 'shredded', 'grated',
  'peeled', 'unpeeled', 'pitted', 'unpitted', 'trimmed',
  'boneless', 'skinless', 'bone-in', 'skin-on',
  'hass', 'navel', 'fuji', 'gala', 'granny',
  'not', 'fortified', 'enriched', 'unenriched',
  'mature', 'immature', 'regular', 'instant',
  'plain', 'unsalted', 'salted', 'unsweetened', 'sweetened',
  'with', 'without', 'and', 'or', 'in', 'from', 'of',
  'all', 'varieties', 'types', 'type', 'variety',
  'ns', 'as', 'nfs', 'to', 'fat', 'free',
]);

// Common grocery aliases: search term → what to actually search on Kroger
const GROCERY_ALIASES: Record<string, string> = {
  'bulgur': 'bulgur wheat grain',
  'cereals': 'cereal',
  'oats': 'old fashioned oats',
  'quinoa': 'quinoa grain',
  'couscous': 'couscous grain',
  'farro': 'farro grain',
  'lentils': 'dry lentils',
  'chickpeas': 'canned chickpeas',
  'tofu': 'tofu',
  'tempeh': 'tempeh',
  'edamame': 'frozen edamame',
  'hummus': 'hummus',
  'tahini': 'tahini paste',
  'miso': 'miso paste',
  'nutritional yeast': 'nutritional yeast',
  'flaxseed': 'ground flaxseed',
  'chia seeds': 'chia seeds',
  'hemp seeds': 'hemp hearts',
  'avocado': 'fresh avocado',
  'sweet potato': 'sweet potato',
  'greek yogurt': 'greek yogurt plain',
  'cottage cheese': 'cottage cheese',
  'ricotta': 'ricotta cheese',
};

function cleanSearchTerm(name: string): string {
  const parts = name.split(/[,/]/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return name;

  const mainItem = parts[0].toLowerCase();

  // Check alias table first
  const aliasKey = mainItem.replace(/s$/, ''); // also try singular
  if (GROCERY_ALIASES[mainItem]) return GROCERY_ALIASES[mainItem];
  if (GROCERY_ALIASES[aliasKey]) return GROCERY_ALIASES[aliasKey];

  const qualifiers: string[] = [];
  for (let i = 1; i < Math.min(parts.length, 3); i++) {
    const part = parts[i].toLowerCase().trim();
    const words = part.split(/\s+/);
    const meaningful = words.filter(w => !USDA_NOISE.has(w) && w.length > 1 && !/^\d/.test(w));
    if (meaningful.length > 0 && meaningful.length <= 2) {
      qualifiers.push(meaningful.join(' '));
    }
  }

  let term = qualifiers.length > 0
    ? `${qualifiers.join(' ')} ${mainItem}`
    : mainItem;

  term = term.replace(/\(.*?\)/g, '').trim();
  term = term.replace(/\d+%\s*\w*/g, '').trim();
  term = term.replace(/\s+/g, ' ').trim();

  return term || parts[0];
}

/**
 * Check if a word appears as a whole word (not substring) in text.
 * "bulgur" should NOT match "burger", but "beef" should match "ground beef".
 */
function containsWholeWord(text: string, word: string): boolean {
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(text);
}

/**
 * Strict scoring: the primary search word MUST appear as a whole word
 * in the product description, or the match is rejected.
 */
function scoreMatch(searchTerm: string, product: KrogerProduct): number {
  const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const desc = product.description.toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const fullText = `${desc} ${brand}`;

  if (searchWords.length === 0) return 0;

  // The primary word (first meaningful word) MUST appear as a whole word
  const primaryWord = searchWords[0];
  if (!containsWholeWord(fullText, primaryWord)) {
    return 0; // Hard reject — "bulgur" won't match "burger"
  }

  let score = 0;

  // Base: what fraction of search words appear as whole words?
  const matchedWords = searchWords.filter(w => containsWholeWord(fullText, w));
  score += matchedWords.length / searchWords.length;

  // Bonus if the full search term appears in the description
  if (fullText.includes(searchTerm.toLowerCase())) {
    score += 0.3;
  }

  // Bonus for having a price (in stock)
  if (product.items?.[0]?.price) {
    score += 0.05;
  }

  // Slight penalty for very long descriptions (likely combo packs, not the actual item)
  if (desc.length > 80) {
    score -= 0.05;
  }

  return Math.max(0, Math.min(score, 1));
}

// Minimum score to accept a match — below this, report "no match"
const MIN_CONFIDENCE = 0.4;

const WEIGHT_CONV: Record<string, number> = {
  'g': 1, 'gram': 1, 'grams': 1,
  'kg': 1000, 'kilogram': 1000, 'kilograms': 1000,
  'oz': 28.35, 'ounce': 28.35, 'ounces': 28.35,
  'lb': 453.6, 'lbs': 453.6, 'pound': 453.6, 'pounds': 453.6,
};

const VOLUME_CONV: Record<string, number> = {
  'ml': 1, 'milliliter': 1, 'milliliters': 1,
  'l': 1000, 'liter': 1000, 'liters': 1000,
  'cup': 240, 'cups': 240,
  'fl oz': 29.57, 'fl. oz': 29.57, 'fl oz.': 29.57,
};

function groceryNeedGrams(item: GroceryItem): number | null {
  const u = item.unit.toLowerCase().replace(/\.$/, '');
  if (WEIGHT_CONV[u]) return item.qty * WEIGHT_CONV[u];
  if (VOLUME_CONV[u]) return item.qty * VOLUME_CONV[u]; // ~1g/ml for food
  return null;
}

function productSizeGrams(product: KrogerProduct): number | null {
  const sizeStr = product.items?.[0]?.size || '';
  const segments = sizeStr.split('/').map(s => s.trim());
  for (const seg of segments) {
    const m = seg.match(/^([\d.]+)\s*(.*)/);
    if (!m) continue;
    const amt = parseFloat(m[1]);
    const u = m[2].toLowerCase().trim();
    if (WEIGHT_CONV[u]) return amt * WEIGHT_CONV[u];
    if (VOLUME_CONV[u]) return amt * VOLUME_CONV[u];
    if (u === 'oz' || u === 'ounce' || u === 'ounces') return amt * 28.35;
  }
  return null;
}

/**
 * Prefer products that require fewer packages. Products that can
 * cover the need in 1-2 packages get a bonus; products requiring 5+
 * packages get a penalty.
 */
function sizeFitBonus(item: GroceryItem, product: KrogerProduct): number {
  const needG = groceryNeedGrams(item);
  const sizeG = productSizeGrams(product);
  if (needG === null || sizeG === null || sizeG <= 0) return 0;

  const pkgsNeeded = needG / sizeG;
  if (pkgsNeeded <= 1) return 0.15;  // 1 package covers it
  if (pkgsNeeded <= 2) return 0.10;
  if (pkgsNeeded <= 3) return 0.05;
  if (pkgsNeeded >= 6) return -0.10; // many small packages — avoid
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    await requireStaffSession();
    const body = await request.json();
    const items: GroceryItem[] = body.items;
    const locationId: string | undefined = body.locationId;

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const token = await getServiceToken();
    const results: {
      groceryItem: GroceryItem;
      krogerProduct: {
        productId: string;
        upc: string;
        description: string;
        brand: string;
        price: number | null;
        imageUrl: string | null;
        size: string;
      } | null;
      confidence: number;
    }[] = [];

    for (const item of items) {
      try {
        const cleanedTerm = cleanSearchTerm(item.name);
        const locParam = locationId ? `&filter.locationId=${locationId}` : '';

        let bestMatch: { product: KrogerProduct; score: number } | null = null;

        // Primary search
        const data = await krogerGet(
          `/products?filter.term=${encodeURIComponent(cleanedTerm)}&filter.limit=10${locParam}`,
          token
        ) as { data?: KrogerProduct[] };

        let products = data.data || [];

        if (products.length > 0) {
          const scored = products
            .map(p => ({ product: p, score: scoreMatch(cleanedTerm, p) + sizeFitBonus(item, p) }))
            .filter(s => s.score >= MIN_CONFIDENCE)
            .sort((a, b) => b.score - a.score);
          if (scored.length > 0) bestMatch = scored[0];
        }

        // Fallback: try the main food word only (e.g., just "avocado" from "fresh avocado")
        if (!bestMatch) {
          const words = cleanedTerm.split(/\s+/);
          // Try the last word (often the main noun), then the first word
          const fallbacks = [
            words[words.length - 1],
            words[0],
            // Also try adding "fresh" for produce items
            `fresh ${words[words.length - 1]}`,
          ].filter((v, i, a) => v !== cleanedTerm && a.indexOf(v) === i);

          for (const fallback of fallbacks) {
            if (bestMatch) break;
            try {
              const fbData = await krogerGet(
                `/products?filter.term=${encodeURIComponent(fallback)}&filter.limit=10${locParam}`,
                token
              ) as { data?: KrogerProduct[] };
              const fbProducts = fbData.data || [];
              if (fbProducts.length > 0) {
                const scored = fbProducts
                  .map(p => ({ product: p, score: scoreMatch(fallback, p) + sizeFitBonus(item, p) }))
                  .filter(s => s.score >= MIN_CONFIDENCE)
                  .sort((a, b) => b.score - a.score);
                if (scored.length > 0) bestMatch = scored[0];
              }
            } catch { /* skip failed fallback */ }
          }
        }

        if (!bestMatch) {
          results.push({ groceryItem: item, krogerProduct: null, confidence: 0 });
        } else {
          results.push({
            groceryItem: item,
            krogerProduct: {
              productId: bestMatch.product.productId,
              upc: bestMatch.product.upc,
              description: bestMatch.product.description,
              brand: bestMatch.product.brand,
              price: getPrice(bestMatch.product),
              imageUrl: getImageUrl(bestMatch.product),
              size: bestMatch.product.items?.[0]?.size || '',
            },
            confidence: bestMatch.score,
          });
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (searchErr) {
        console.error(`[Kroger Search] Failed for "${item.name}":`, searchErr);
        results.push({ groceryItem: item, krogerProduct: null, confidence: 0 });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Kroger Search]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Product search failed' },
      { status: 500 }
    );
  }
}
