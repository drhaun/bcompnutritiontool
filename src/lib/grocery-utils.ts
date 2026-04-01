/**
 * Grocery list consolidation utilities.
 *
 * Handles parsing, normalizing, and consolidating ingredients from
 * AI-generated meals (which embed gram weights in item names) and
 * USDA database lookups (comma-delimited scientific names) into a
 * clean, shopping-friendly grocery list.
 */

// ─── Word & phrase sets for name normalization ───────────────────────────────

const PREP_WORDS = new Set([
  // Cooking methods
  'cooked', 'raw', 'baked', 'boiled', 'steamed', 'grilled', 'roasted',
  'sauteed', 'sautéed', 'blanched', 'wilted', 'chilled', 'smoked', 'fried',
  'braised', 'poached', 'toasted', 'warmed', 'charred', 'broiled', 'seared',
  // Cutting / prep
  'diced', 'sliced', 'chopped', 'minced', 'shredded', 'grated', 'mashed',
  'crushed', 'cubed', 'halved', 'quartered', 'julienned', 'torn', 'crumbled',
  'stuffed', 'breaded', 'marinated', 'seasoned', 'glazed', 'pickled',
  // State / freshness
  'fresh', 'frozen', 'canned', 'dried', 'dry', 'dehydrated',
  'drained', 'rinsed', 'peeled', 'pitted', 'deveined', 'trimmed',
  'deboned', 'cleaned', 'washed', 'thawed',
  // Processing descriptors
  'enriched', 'unenriched', 'fortified', 'parboiled', 'refined', 'unrefined',
  'processed', 'unprocessed', 'pasteurized', 'homogenized',
  // Quality / dietary
  'plain', 'unsalted', 'salted', 'unsweetened', 'sweetened',
  'regular', 'instant', 'quick',
  'non-fat', 'nonfat', 'low-fat', 'lowfat', 'fat-free', 'reduced-fat', 'full-fat',
  'extra', 'virgin', 'organic', 'conventional', 'lite', 'light',
  // Prep-context words (appear inside parenthetical cooking notes)
  'stirred', 'mixed', 'whisked', 'tossed', 'drizzled', 'melted', 'dissolved',
  'combined', 'folded', 'spread', 'layered', 'topped', 'served',
  // Prepositions / articles
  'into', 'with', 'for', 'on', 'of', 'in', 'the', 'a', 'an', 'to', 'and', 'or', 'as',
  // Context words commonly found in paren cooking notes
  'sauce', 'side', 'top', 'topping', 'garnish', 'base', 'filling',
  'marinade', 'dressing', 'glaze', 'coating',
  // USDA meta-language
  'includes', 'contains', 'also', 'previously', 'sometimes',
]);

const USDA_SKIP_PATTERNS: RegExp[] = [
  /^raw$/i, /^cooked$/i, /^fresh$/i, /^frozen$/i, /^dried$/i, /^dry$/i,
  /^plain$/i, /^smoked$/i,
  /^enriched$/i, /^unenriched$/i, /^fortified$/i, /^not fortified$/i,
  /^parboiled$/i,
  /lean.*fat|fat.*lean|\d+%/i,
  /\bsodium\b/i, /\bdrained\b/i, /\brinsed\b/i,
  /farm.?raised|wild.?caught/i,
  /\b(atlantic|pacific)\b/i,
  /calcium propionate/i, /includes?\s/i,
  /with (added )?salt/i, /without (skin|salt|bone)/i, /with (skin|bone)/i,
  /regular and quick/i, /large or small curd/i,
  /\bboneless\b/i, /\bskinless\b/i,
  /\bunsalted\b/i, /\bsalted\b/i,
  /\bbleached\b/i, /\bunbleached\b/i,
  /^low[- ]?fat$/i, /^non[- ]?fat$/i, /^full[- ]?fat$/i,
  /^reduced[- ]?fat$/i, /^fat[- ]?free$/i,
  /^whole$/i, /^extra virgin$/i,
];

const BROAD_CATEGORIES = new Set([
  'fish', 'crustaceans', 'cereals', 'snacks', 'meat', 'poultry',
  'legumes', 'beverages', 'spices', 'seeds', 'nuts',
]);

// Two-word USDA pairs whose order should be preserved (not reversed)
const KEEP_ORDER_PAIRS = new Set([
  'chicken breast', 'chicken thigh', 'chicken leg', 'chicken wing', 'chicken drumstick',
  'chicken tender', 'chicken liver',
  'turkey breast', 'turkey thigh', 'turkey leg', 'turkey drumstick',
  'pork chop', 'pork loin', 'pork tenderloin', 'pork belly', 'pork shoulder',
  'beef steak', 'beef roast', 'beef brisket', 'beef tenderloin', 'beef shank',
  'lamb chop', 'lamb leg', 'lamb shank', 'lamb shoulder',
  'egg white', 'egg yolk',
  'lemon juice', 'lime juice', 'orange juice', 'apple juice', 'grape juice',
  'coconut milk', 'coconut oil', 'coconut cream', 'coconut water', 'coconut flour',
  'almond milk', 'almond flour', 'almond butter',
  'peanut butter', 'cashew butter', 'sunflower butter',
  'sour cream', 'cottage cheese', 'sweet potato', 'sweet corn',
  'green bean', 'green pea',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is'))
    return word.slice(0, -1);
  return word;
}

function capitalize(word: string): string {
  if (!word) return '';
  if (word.includes('-')) return word.split('-').map(capitalize).join('-');
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function parseAmount(amountStr: string): { qty: number; unit: string } {
  const s = amountStr.trim();

  // Mixed number: "1 1/2 cups"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (mixedMatch) {
    return {
      qty: parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]),
      unit: mixedMatch[4]?.trim() || 'serving',
    };
  }

  // Fraction: "1/2 cup"
  const fracMatch = s.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (fracMatch) {
    return {
      qty: parseInt(fracMatch[1]) / parseInt(fracMatch[2]),
      unit: fracMatch[3]?.trim() || 'serving',
    };
  }

  // Decimal / integer: "1.5 cups", "2 cups"
  const numMatch = s.match(/^([\d.]+)\s*(.*)$/);
  if (numMatch) {
    return { qty: parseFloat(numMatch[1]) || 1, unit: numMatch[2]?.trim() || 'serving' };
  }

  return { qty: 1, unit: 'serving' };
}

// ─── Ingredient name parsing ─────────────────────────────────────────────────

interface ParsedIngredient {
  displayName: string;
  matchKey: string;
  qty: number;
  rawUnit: string;
  isUSDA: boolean;
}

function parseGroceryIngredient(itemName: string, amountStr: string): ParsedIngredient | null {
  let name = itemName.trim();
  const amt = amountStr || '1 serving';

  if (/\b(to taste|as needed|optional|pinch|dash|garnish)\b/i.test(amt)) {
    return null;
  }

  let qty: number;
  let rawUnit: string;

  // Step 1: detect embedded quantity in the item name  ("100g chicken breast")
  const embeddedMatch = name.match(
    /^(\d+(?:\.\d+)?)\s*(g|oz|ml|kg|lb|lbs|cups?|tbsp|tsp|fl\s*oz)\b\s+(.+)$/i,
  );
  if (embeddedMatch) {
    qty = parseFloat(embeddedMatch[1]);
    rawUnit = embeddedMatch[2].toLowerCase().replace(/\s+/g, '');
    name = embeddedMatch[3].trim();
  } else {
    const parsed = parseAmount(amt);
    qty = parsed.qty;
    rawUnit = parsed.unit;
  }

  // Step 2: extract meaningful descriptors from parentheses then remove them
  const parenDescriptors: string[] = [];
  name = name
    .replace(/\(([^)]*)\)/g, (_, inner: string) => {
      const raw = inner.trim();
      // Cooking instructions contain directional preps — skip entirely
      // e.g. "(mixed into oats)", "(stirred into sauce)", "(drizzled on top)"
      if (/\b(into|onto|over|upon|through)\b/i.test(raw)) return '';
      // USDA meta-descriptions — skip entirely
      // e.g. "(includes sourdough)", "(formerly …)"
      if (/^(includes?|also|formerly)\b/i.test(raw)) return '';

      const words = raw
        .split(/[,]+/)
        .flatMap((part: string) => part.trim().split(/\s+/))
        .map((w: string) => w.toLowerCase().trim())
        .filter(Boolean);
      for (const w of words) {
        if (!PREP_WORDS.has(w) && w.length > 2 && !/\d/.test(w) && !/[%/]/.test(w)) {
          parenDescriptors.push(w);
        }
      }
      return '';
    })
    .trim();

  // Step 3: normalise the ingredient name
  let nameWords: string[];
  const isUSDA = name.includes(',');

  if (isUSDA) {
    const commaParts = name.split(',').map((p) => p.trim()).filter(Boolean);
    const meaningful = commaParts.filter(
      (part) => !USDA_SKIP_PATTERNS.some((pat) => pat.test(part.trim())),
    );
    if (meaningful.length > 1 && BROAD_CATEGORIES.has(meaningful[0].toLowerCase())) {
      meaningful.shift();
    }

    // Cap at 2 meaningful USDA parts to keep names concise
    // e.g. "Olives, green, manzanilla, stuffed with pimiento" → ["Olives", "green"]
    if (meaningful.length > 2) meaningful.length = 2;

    // Flatten to words then strip individual prep words
    const allWords = meaningful
      .flatMap((p) => p.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 1 && !PREP_WORDS.has(w) && !/^\d/.test(w) && !/[%/]/.test(w));

    // USDA reordering — figure out the original comma-part structure after filtering
    const filteredParts = meaningful.map((p) => {
      return p
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1 && !PREP_WORDS.has(w) && !/^\d/.test(w) && !/[%/]/.test(w))
        .join(' ');
    }).filter(Boolean);

    if (filteredParts.length === 1) {
      nameWords = filteredParts[0].split(/\s+/);
    } else if (filteredParts.length === 2) {
      const pair = filteredParts.join(' ');
      if (KEEP_ORDER_PAIRS.has(pair)) {
        nameWords = pair.split(/\s+/);
      } else {
        // Reverse for natural English: "Beans, black" → "black beans"
        nameWords = [...filteredParts[1].split(/\s+/), ...filteredParts[0].split(/\s+/)];
      }
    } else {
      // 3+ parts → reverse all comma parts for natural English
      nameWords = filteredParts.reverse().flatMap((p) => p.split(/\s+/));
    }

    // If all words were filtered, fall back to the raw meaningful parts
    if (nameWords.length === 0 && allWords.length > 0) {
      nameWords = allWords;
    }
  } else {
    nameWords = name.toLowerCase().split(/\s+/).filter(
      (w) => w.length > 1 && !PREP_WORDS.has(w) && !/^\d/.test(w) && !/[%/]/.test(w),
    );
  }

  // Step 4: prepend meaningful parenthetical descriptors (e.g. "bell" from "peppers (bell, diced)")
  if (parenDescriptors.length > 0) {
    nameWords = [...parenDescriptors, ...nameWords];
  }

  // Deduplicate preserving order
  const seen = new Set<string>();
  nameWords = nameWords.filter((w) => {
    if (seen.has(w)) return false;
    seen.add(w);
    return true;
  });

  if (nameWords.length === 0) {
    const fallback = name.toLowerCase().split(/\s+/)[0];
    nameWords = [fallback || 'item'];
  }

  // Step 5: build display name (title case, preserves word order)
  const displayName = nameWords.map(capitalize).join(' ');

  // Step 6: build matching key (singularised + sorted → order-independent)
  const matchKey = [...new Set(nameWords.map(singularize))].sort().join(' ');

  return { displayName, matchKey, qty, rawUnit, isUSDA };
}

// ─── Unit normalisation & conversion ─────────────────────────────────────────

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  if (u === 'g' || u === 'gram' || u === 'grams') return 'g';
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms') return 'kg';
  if (u === 'oz' || u === 'ounce' || u === 'ounces') return 'oz';
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return 'lb';
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return 'ml';
  if (u === 'l' || u === 'liter' || u === 'liters') return 'L';
  if (u === 'cup' || u === 'cups') return 'cup';
  if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') return 'tbsp';
  if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return 'tsp';
  if (u === 'floz' || u === 'fl oz' || u === 'fluid_ounce') return 'floz';
  if (u === '' || u === 'serving' || u === 'servings') return 'serving';
  if (u === 'piece' || u === 'pieces' || u === 'pcs') return 'piece';
  if (u === 'scoop' || u === 'scoops') return 'scoop';
  if (u === 'slice' || u === 'slices') return 'slice';
  if (u === 'large' || u === 'medium' || u === 'small') return 'piece';
  return u;
}

function convertToBaseUnit(qty: number, unit: string): { qty: number; unit: string } {
  if (unit === 'kg') return { qty: qty * 1000, unit: 'g' };
  if (unit === 'oz') return { qty: qty * 28.35, unit: 'g' };
  if (unit === 'lb') return { qty: qty * 453.6, unit: 'g' };
  if (unit === 'L') return { qty: qty * 1000, unit: 'ml' };
  if (unit === 'cup') return { qty: qty * 240, unit: 'ml' };
  if (unit === 'tbsp') return { qty: qty * 15, unit: 'ml' };
  if (unit === 'tsp') return { qty: qty * 5, unit: 'ml' };
  if (unit === 'floz') return { qty: qty * 29.57, unit: 'ml' };
  return { qty, unit };
}

function getUnitCategory(normalizedUnit: string): string {
  if (['g', 'kg', 'oz', 'lb'].includes(normalizedUnit)) return 'weight';
  if (['ml', 'L', 'cup', 'tbsp', 'tsp', 'floz'].includes(normalizedUnit)) return 'volume';
  return 'count';
}

function formatGroceryQuantity(qty: number, unit: string): { qty: number; unit: string } {
  if (unit === 'g') {
    if (qty >= 1000) {
      return { qty: Math.ceil(qty / 500) * 0.5, unit: 'kg' };
    }
    const oz = qty / 28.35;
    if (oz >= 16) {
      return { qty: Math.ceil((oz / 16) * 2) / 2, unit: 'lb' };
    }
    if (oz >= 1) return { qty: Math.ceil(oz), unit: 'oz' };
    return { qty: Math.round(qty), unit: 'g' };
  }

  if (unit === 'ml') {
    if (qty >= 1000) return { qty: Math.ceil((qty / 1000) * 2) / 2, unit: 'L' };
    const cups = qty / 240;
    if (cups >= 0.5) {
      if (cups >= 3.5) return { qty: Math.ceil(cups / 4) * 4, unit: 'cups' };
      return { qty: Math.ceil(cups * 2) / 2, unit: cups >= 1.5 ? 'cups' : 'cup' };
    }
    const tbsp = qty / 15;
    if (tbsp >= 1) return { qty: Math.ceil(tbsp), unit: 'tbsp' };
    return { qty: Math.ceil(qty / 5), unit: 'tsp' };
  }

  if (['serving', 'piece', 'slice', 'scoop'].includes(unit)) {
    return { qty: Math.ceil(qty), unit };
  }

  if (qty >= 100) return { qty: Math.round(qty), unit };
  if (qty >= 10) return { qty: Math.round(qty * 10) / 10, unit };
  if (qty >= 1) return { qty: Math.round(qty * 4) / 4, unit };
  return { qty: Math.round(qty * 100) / 100, unit };
}

// ─── Subset key merging ──────────────────────────────────────────────────────

interface IngredientBucket {
  totalQty: number;
  baseUnit: string;
  displayName: string;
  isUSDA: boolean;
  category: string;
  usedIn: number;
}

function mergeSubsetKeys(map: Map<string, IngredientBucket>) {
  const byCategory = new Map<string, { fullKey: string; matchKey: string }[]>();

  for (const fullKey of map.keys()) {
    const pipeIdx = fullKey.lastIndexOf('|');
    const matchKey = fullKey.slice(0, pipeIdx);
    const category = fullKey.slice(pipeIdx + 1);
    const group = byCategory.get(category) || [];
    group.push({ fullKey, matchKey });
    byCategory.set(category, group);
  }

  for (const group of byCategory.values()) {
    group.sort((a, b) => a.matchKey.split(' ').length - b.matchKey.split(' ').length);

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const shorter = group[i];
        const longer = group[j];
        if (!map.has(shorter.fullKey) || !map.has(longer.fullKey)) continue;

        const shortWords = shorter.matchKey.split(' ');
        const longWordSet = new Set(longer.matchKey.split(' '));

        // Require shorter key to have ≥2 words to prevent overly-broad merges
        if (shortWords.length >= 2 && shortWords.every((w) => longWordSet.has(w))) {
          const shortEntry = map.get(shorter.fullKey)!;
          const longEntry = map.get(longer.fullKey)!;

          shortEntry.totalQty += longEntry.totalQty;
          shortEntry.usedIn += longEntry.usedIn;
          if (longEntry.isUSDA && !shortEntry.isUSDA) {
            shortEntry.displayName = longEntry.displayName;
            shortEntry.isUSDA = true;
          }

          map.delete(longer.fullKey);
        }
      }
    }
  }
}

// ─── Cross-category merging ──────────────────────────────────────────────────

/**
 * When the same ingredient has entries in multiple unit categories
 * (e.g. "olive oil" in weight, volume, AND count), merge them into
 * a single entry using approximate conversions.
 */
function mergeUnitCategories(map: Map<string, IngredientBucket>) {
  // Group entries by matchKey (the part before the last |)
  const groups = new Map<string, { fullKey: string; category: string }[]>();
  for (const fullKey of map.keys()) {
    const pipeIdx = fullKey.lastIndexOf('|');
    const matchKey = fullKey.slice(0, pipeIdx);
    const category = fullKey.slice(pipeIdx + 1);
    const group = groups.get(matchKey) || [];
    group.push({ fullKey, category });
    groups.set(matchKey, group);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    // Pick the dominant entry: prefer non-count with highest quantity
    let dominant: { fullKey: string; category: string } | null = null;
    let dominantQty = -1;
    for (const entry of group) {
      const bucket = map.get(entry.fullKey);
      if (!bucket) continue;
      if (entry.category !== 'count' && bucket.totalQty > dominantQty) {
        dominant = entry;
        dominantQty = bucket.totalQty;
      }
    }
    // If all entries are count, just pick the largest
    if (!dominant) {
      for (const entry of group) {
        const bucket = map.get(entry.fullKey);
        if (!bucket) continue;
        if (bucket.totalQty > dominantQty) {
          dominant = entry;
          dominantQty = bucket.totalQty;
        }
      }
    }
    if (!dominant) continue;

    const dominantBucket = map.get(dominant.fullKey)!;

    for (const entry of group) {
      if (entry.fullKey === dominant.fullKey) continue;
      const bucket = map.get(entry.fullKey);
      if (!bucket) continue;

      let convertedQty: number;
      if (entry.category === 'count') {
        // 1 serving ≈ 1 tbsp (15ml) for liquids, ≈ 1 oz (28g) for solids
        if (dominant.category === 'volume') {
          convertedQty = bucket.totalQty * 15;
        } else {
          convertedQty = bucket.totalQty * 28.35;
        }
      } else if (entry.category === 'weight' && dominant.category === 'volume') {
        convertedQty = bucket.totalQty; // g → ml (≈1:1 for most foods)
      } else if (entry.category === 'volume' && dominant.category === 'weight') {
        convertedQty = bucket.totalQty; // ml → g (≈1:1 for most foods)
      } else {
        convertedQty = bucket.totalQty;
      }

      dominantBucket.totalQty += convertedQty;
      dominantBucket.usedIn += bucket.usedIn;
      if (bucket.isUSDA && !dominantBucket.isUSDA) {
        dominantBucket.displayName = bucket.displayName;
        dominantBucket.isUSDA = true;
      }
      map.delete(entry.fullKey);
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface RawIngredient {
  item: string;
  amount: string;
  category: string;
  mealMultiplier: number;
}

export interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  exactAmount: string;
  category: string;
  usedIn: number;
}

export function consolidateGroceryList(
  ingredients: RawIngredient[],
  servingMultiplier: number,
): GroceryItem[] {
  const ingredientMap = new Map<string, IngredientBucket>();

  for (const raw of ingredients) {
    const parsed = parseGroceryIngredient(raw.item, raw.amount);
    if (!parsed) continue;

    const value = parsed.qty * raw.mealMultiplier;
    const unit = normalizeUnit(parsed.rawUnit);
    const converted = convertToBaseUnit(value, unit);
    const unitCategory = getUnitCategory(unit);
    const mapKey = `${parsed.matchKey}|${unitCategory}`;

    const existing = ingredientMap.get(mapKey);
    if (existing) {
      existing.totalQty += converted.qty;
      existing.usedIn += 1;
      // Prefer USDA-derived display names (they tend to be more accurate)
      if (parsed.isUSDA && !existing.isUSDA) {
        existing.displayName = parsed.displayName;
        existing.isUSDA = true;
      }
    } else {
      ingredientMap.set(mapKey, {
        totalQty: converted.qty,
        baseUnit: converted.unit,
        displayName: parsed.displayName,
        isUSDA: parsed.isUSDA,
        category: raw.category,
        usedIn: 1,
      });
    }
  }

  mergeSubsetKeys(ingredientMap);
  mergeUnitCategories(ingredientMap);

  return Array.from(ingredientMap.entries())
    .map(([, data]) => {
      const scaled = data.totalQty * servingMultiplier;
      const formatted = formatGroceryQuantity(scaled, data.baseUnit);

      let exactStr: string;
      if (data.baseUnit === 'g') exactStr = `${Math.round(scaled)}g`;
      else if (data.baseUnit === 'ml') exactStr = `${Math.round(scaled)}ml`;
      else exactStr = `${Math.round(scaled * 10) / 10} ${data.baseUnit}`;

      return {
        name: data.displayName,
        qty: formatted.qty,
        unit: formatted.unit,
        exactAmount: exactStr,
        category: data.category,
        usedIn: data.usedIn,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Clean a raw ingredient name for human-readable display.
 * Handles USDA scientific names ("Fish, salmon, Atlantic, farm raised, raw" → "Salmon")
 * and AI embedded-gram names ("100g chicken breast (cooked, diced)" → "Chicken Breast").
 */
export function cleanIngredientName(rawName: string): string {
  const parsed = parseGroceryIngredient(rawName, '1 serving');
  return parsed?.displayName || rawName;
}
