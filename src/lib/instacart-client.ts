/**
 * Instacart Developer Platform API client.
 *
 * Supports three Instacart endpoints:
 *   1. Shopping List  — consolidated grocery list from a meal plan
 *   2. Recipe Page    — individual meal with ingredients + cooking instructions
 *   3. Nearby Retailers — store lookup by postal code for pre-selection
 *
 * Dev:  https://connect.dev.instacart.tools
 * Prod: https://connect.instacart.com
 *
 * @see https://docs.instacart.com/developer_platform_api/
 */

const INSTACART_BASE =
  process.env.INSTACART_API_BASE || 'https://connect.dev.instacart.tools';

function getApiKey(): string | null {
  return process.env.INSTACART_API_KEY || null;
}

export function isInstacartConfigured(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Maps internal grocery-list units to Instacart-supported measurement units.
 * @see https://docs.instacart.com/developer_platform_api/api/units_of_measurement
 */
const UNIT_MAP: Record<string, string> = {
  // Weight
  g: 'gram',
  gram: 'gram',
  grams: 'gram',
  kg: 'kilogram',
  kilogram: 'kilogram',
  oz: 'ounce',
  ounce: 'ounce',
  ounces: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  pound: 'pound',
  pounds: 'pound',

  // Volume
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tablespoon',
  tablespoon: 'tablespoon',
  tablespoons: 'tablespoon',
  tsp: 'teaspoon',
  teaspoon: 'teaspoon',
  teaspoons: 'teaspoon',
  ml: 'milliliter',
  milliliter: 'milliliter',
  milliliters: 'milliliter',
  L: 'liter',
  l: 'liter',
  liter: 'liter',
  liters: 'liter',
  'fl oz': 'fl oz',
  floz: 'fl oz',
  gallon: 'gallon',
  gallons: 'gallon',
  gal: 'gallon',
  pint: 'pint',
  pints: 'pint',
  pt: 'pint',
  quart: 'quart',
  quarts: 'quart',
  qt: 'quart',

  // Countable
  each: 'each',
  serving: 'each',
  servings: 'each',
  piece: 'each',
  pieces: 'each',
  slice: 'each',
  slices: 'each',
  scoop: 'each',
  scoops: 'each',
  large: 'large',
  medium: 'medium',
  small: 'small',
  bunch: 'bunch',
  bunches: 'bunch',
  can: 'can',
  cans: 'can',
  head: 'head',
  heads: 'head',
  package: 'package',
  packages: 'package',
  packet: 'packet',
};

function mapUnit(unit: string): string {
  return UNIT_MAP[unit.toLowerCase().trim()] || 'each';
}

/** Instacart's documented 4XX error response structures. */
interface InstacartSingleError {
  error?: { message?: string; error_code?: number };
}
interface InstacartMultiError {
  errors?: Array<{
    message?: string;
    error_code?: number;
    meta?: Record<string, string>;
  }>;
}

function parseInstacartError(status: number, text: string): string {
  try {
    const json = JSON.parse(text) as InstacartSingleError & InstacartMultiError;
    if (json.errors?.length) {
      return (
        json.errors
          .map((e) => e.message)
          .filter(Boolean)
          .join('; ') || `Instacart API error ${status}`
      );
    }
    if (json.error?.message) {
      return json.error.message;
    }
  } catch {
    // Not JSON — fall through
  }
  return text || `Instacart API error ${status}`;
}

function authHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Instacart API key not configured');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Health filters
// ---------------------------------------------------------------------------

const VALID_HEALTH_FILTERS = new Set([
  'ORGANIC',
  'GLUTEN_FREE',
  'FAT_FREE',
  'VEGAN',
  'KOSHER',
  'SUGAR_FREE',
  'LOW_FAT',
]);

/**
 * Map dietary preferences from a client profile to Instacart health filter values.
 * Only returns filters that Instacart actually supports.
 */
export function mapDietaryToHealthFilters(
  dietaryPreferences?: string[],
): string[] {
  if (!dietaryPreferences?.length) return [];

  const map: Record<string, string> = {
    organic: 'ORGANIC',
    'gluten-free': 'GLUTEN_FREE',
    'gluten free': 'GLUTEN_FREE',
    vegan: 'VEGAN',
    kosher: 'KOSHER',
    'sugar-free': 'SUGAR_FREE',
    'sugar free': 'SUGAR_FREE',
    'low-fat': 'LOW_FAT',
    'low fat': 'LOW_FAT',
    'fat-free': 'FAT_FREE',
    'fat free': 'FAT_FREE',
  };

  const filters: string[] = [];
  for (const pref of dietaryPreferences) {
    const mapped = map[pref.toLowerCase().trim()];
    if (mapped && VALID_HEALTH_FILTERS.has(mapped)) {
      filters.push(mapped);
    }
  }
  return [...new Set(filters)];
}

// ---------------------------------------------------------------------------
// Retailer key URL helper
// ---------------------------------------------------------------------------

/**
 * Append a retailer_key query param to an Instacart products link URL so the
 * page opens with that store pre-selected.
 * @see https://docs.instacart.com/developer_platform_api/guide/tutorials/create_a_recipe_page/#optional-choose-a-preferred-retailer-where-the-ingredients-can-be-purchased
 */
export function appendRetailerKey(url: string, retailerKey: string): string {
  if (!retailerKey) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}retailer_key=${encodeURIComponent(retailerKey)}`;
}

// ---------------------------------------------------------------------------
// 1. Shopping List  — POST /idp/v1/products/products_link
// ---------------------------------------------------------------------------

export interface GroceryLineItem {
  name: string;
  qty: number;
  unit: string;
}

export interface CreateShoppingListOptions {
  items: GroceryLineItem[];
  title?: string;
  linkbackUrl?: string;
  instructions?: string[];
  healthFilters?: string[];
  retailerKey?: string;
}

/**
 * Create a shopping list on Instacart and return the checkout URL.
 * @see https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
 */
export async function createInstacartShoppingList(
  options: CreateShoppingListOptions,
): Promise<string> {
  const {
    items,
    title,
    linkbackUrl,
    instructions,
    healthFilters,
    retailerKey,
  } = options;

  const hasHealthFilters = healthFilters && healthFilters.length > 0;

  const lineItems = items
    .filter((item) => item.name && item.qty > 0)
    .map((item) => {
      const li: Record<string, unknown> = {
        name: item.name,
        display_text: `${item.qty} ${item.unit} ${item.name}`,
        line_item_measurements: [
          { quantity: item.qty, unit: mapUnit(item.unit) },
        ],
      };
      if (hasHealthFilters) {
        li.filters = { health_filters: healthFilters };
      }
      return li;
    });

  if (lineItems.length === 0) {
    throw new Error('No valid items to send to Instacart');
  }

  const landingConfig: Record<string, unknown> = {};
  if (linkbackUrl) landingConfig.partner_linkback_url = linkbackUrl;

  const body: Record<string, unknown> = {
    title: title || 'Fitomics Meal Plan Grocery List',
    link_type: 'shopping_list',
    line_items: lineItems,
    ...(instructions?.length ? { instructions } : {}),
    ...(Object.keys(landingConfig).length > 0
      ? { landing_page_configuration: landingConfig }
      : {}),
  };

  const res = await fetch(`${INSTACART_BASE}/idp/v1/products/products_link`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Instacart API: shopping-list]', res.status, text);
    throw new Error(parseInstacartError(res.status, text));
  }

  const data = (await res.json()) as { products_link_url: string };
  let url = data.products_link_url;
  if (retailerKey) url = appendRetailerKey(url, retailerKey);
  return url;
}

// ---------------------------------------------------------------------------
// 2. Recipe Page  — POST /idp/v1/products/recipe
// ---------------------------------------------------------------------------

export interface RecipeIngredient {
  name: string;
  displayText: string;
  qty: number;
  unit: string;
}

export interface CreateRecipePageOptions {
  title: string;
  ingredients: RecipeIngredient[];
  instructions?: string[];
  imageUrl?: string;
  servings?: number;
  cookingTime?: number;
  linkbackUrl?: string;
  healthFilters?: string[];
  retailerKey?: string;
}

/**
 * Create a recipe page on Instacart and return the hosted URL.
 * Supports `enable_pantry_items` so clients can uncheck items they already have.
 * @see https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page
 */
export async function createInstacartRecipePage(
  options: CreateRecipePageOptions,
): Promise<string> {
  const {
    title,
    ingredients: rawIngredients,
    instructions,
    imageUrl,
    servings,
    cookingTime,
    linkbackUrl,
    healthFilters,
    retailerKey,
  } = options;

  const hasHealthFilters = healthFilters && healthFilters.length > 0;

  const ingredients = rawIngredients
    .filter((i) => i.name && i.qty > 0)
    .map((i) => {
      const item: Record<string, unknown> = {
        name: i.name,
        display_text: i.displayText || `${i.qty} ${i.unit} ${i.name}`,
        measurements: [{ quantity: i.qty, unit: mapUnit(i.unit) }],
      };
      if (hasHealthFilters) {
        item.filters = { health_filters: healthFilters };
      }
      return item;
    });

  if (ingredients.length === 0) {
    throw new Error('No valid ingredients for recipe');
  }

  const landingConfig: Record<string, unknown> = {
    enable_pantry_items: true,
  };
  if (linkbackUrl) landingConfig.partner_linkback_url = linkbackUrl;

  const body: Record<string, unknown> = {
    title,
    ingredients,
    landing_page_configuration: landingConfig,
    ...(instructions?.length ? { instructions } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(servings ? { servings } : {}),
    ...(cookingTime ? { cooking_time: cookingTime } : {}),
  };

  const res = await fetch(`${INSTACART_BASE}/idp/v1/products/recipe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Instacart API: recipe]', res.status, text);
    throw new Error(parseInstacartError(res.status, text));
  }

  const data = (await res.json()) as { products_link_url: string };
  let url = data.products_link_url;
  if (retailerKey) url = appendRetailerKey(url, retailerKey);
  return url;
}

// ---------------------------------------------------------------------------
// 3. Nearby Retailers  — GET /idp/v1/retailers
// ---------------------------------------------------------------------------

export interface InstacartRetailer {
  retailer_key: string;
  name: string;
  retailer_logo_url: string;
}

/**
 * Look up nearby Instacart retailers by postal code.
 * @see https://docs.instacart.com/developer_platform_api/api/retailers/get_nearby_retailers
 */
export async function getNearbyRetailers(
  postalCode: string,
  countryCode: string = 'US',
): Promise<InstacartRetailer[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Instacart API key not configured');

  const params = new URLSearchParams({
    postal_code: postalCode,
    country_code: countryCode,
  });

  const res = await fetch(`${INSTACART_BASE}/idp/v1/retailers?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Instacart API: retailers]', res.status, text);
    throw new Error(parseInstacartError(res.status, text));
  }

  const data = (await res.json()) as { retailers: InstacartRetailer[] };
  return data.retailers || [];
}
