import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getStaffFromAuthUser, getAdminKrogerToken, krogerPut } from '@/lib/kroger-client';

const MAX_QTY = 3;

const WEIGHT_G: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
};

const VOLUME_ML: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  'fl oz': 29.57, 'fl. oz': 29.57, 'fl oz.': 29.57,
  'fluid ounce': 29.57, 'fluid ounces': 29.57,
  gal: 3785, gallon: 3785, gallons: 3785,
  qt: 946, quart: 946, quarts: 946,
  pt: 473, pint: 473, pints: 473,
};

/**
 * Parse a Kroger product size like "16 oz", "4 bottles / 6.8 fl oz", "12 ct".
 * For multi-packs ("4 bottles / 6.8 fl oz"), returns the TOTAL size.
 */
function parseProductTotalSize(sizeStr: string): { amount: number; unit: string } | null {
  if (!sizeStr) return null;
  const segments = sizeStr.split('/').map(s => s.trim());

  if (segments.length >= 2) {
    const first = segments[0].match(/^([\d.]+)\s*(.*)/);
    const second = segments[1].match(/^([\d.]+)\s*(.*)/);
    if (first && second) {
      const countVal = parseFloat(first[1]);
      const countUnit = first[2].toLowerCase().trim();
      const perVal = parseFloat(second[1]);
      const perUnit = second[2].toLowerCase().trim();

      // "4 bottles / 6.8 fl oz" → total = 4 * 6.8 = 27.2 fl oz
      const isCountLabel = ['bottles', 'bottle', 'cans', 'can', 'bags', 'bag',
        'packs', 'pack', 'pk', 'pc', 'pcs', 'ct', 'count', 'pieces'].includes(countUnit);
      const isWeightOrVol = WEIGHT_G[perUnit] !== undefined || VOLUME_ML[perUnit] !== undefined;

      if (isCountLabel && isWeightOrVol && countVal > 0 && perVal > 0) {
        return { amount: countVal * perVal, unit: perUnit };
      }

      // "8 ct / 20 oz" → the 20 oz IS the total weight of the package
      if (isCountLabel && isWeightOrVol) {
        return { amount: perVal, unit: perUnit };
      }
    }
  }

  // Simple format: "16 oz", "1 lb", "24oz"
  const m = sizeStr.match(/^([\d.]+)\s*(.*)/);
  if (m) {
    const amount = parseFloat(m[1]);
    const unit = m[2].toLowerCase().trim();
    if (amount > 0) return { amount, unit };
  }
  return null;
}

/**
 * Simplified cart quantity calculation.
 * Only does straightforward weight→weight or volume→volume conversions.
 * Capped at MAX_QTY — anything higher means the product match is too small.
 * Returns 1 for anything ambiguous.
 */
function calculateCartQuantity(groceryQty: number, groceryUnit: string, productSize: string): number {
  const prod = parseProductTotalSize(productSize);
  if (!prod || prod.amount <= 0) return 1;

  const gu = groceryUnit.toLowerCase().replace(/\.$/, '');

  // Weight → weight (including oz ↔ fl oz approximation)
  const gWeight = WEIGHT_G[gu] ?? (VOLUME_ML[gu] && ['fl oz', 'fl. oz', 'fl oz.', 'fluid ounce', 'fluid ounces'].includes(gu) ? 28.35 : null);
  const pWeight = WEIGHT_G[prod.unit] ?? (VOLUME_ML[prod.unit] && ['fl oz', 'fl. oz', 'fl oz.', 'fluid ounce', 'fluid ounces'].includes(prod.unit) ? 28.35 : null);
  if (gWeight !== null && pWeight !== null) {
    const needed = (groceryQty * gWeight) / (prod.amount * pWeight);
    return Math.max(1, Math.min(MAX_QTY, Math.ceil(needed)));
  }

  // Volume → volume (including oz ≈ fl oz)
  const gVol = VOLUME_ML[gu] ?? (gu === 'oz' || gu === 'ounce' || gu === 'ounces' ? 29.57 : null);
  const pVol = VOLUME_ML[prod.unit] ?? (prod.unit === 'oz' || prod.unit === 'ounce' || prod.unit === 'ounces' ? 29.57 : null);
  if (gVol !== null && pVol !== null) {
    const needed = (groceryQty * gVol) / (prod.amount * pVol);
    return Math.max(1, Math.min(MAX_QTY, Math.ceil(needed)));
  }

  // Same exact unit
  if (gu === prod.unit && prod.amount > 0) {
    const needed = groceryQty / prod.amount;
    return Math.max(1, Math.min(MAX_QTY, Math.ceil(needed)));
  }

  // Everything else: default to 1. User can adjust with +/- buttons.
  return 1;
}

/**
 * GET — Get a single grocery order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staff = await getStaffFromAuthUser(user.id);
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    const { data: order, error } = await db
      .from('grocery_orders')
      .select('*, clients(name, email)')
      .eq('id', id)
      .eq('staff_id', staff.id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error('[Grocery Order GET]', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

/**
 * PATCH — Update an order. Supported actions:
 * - { action: 'add_to_cart' } — Adds matched items to the admin's Kroger cart
 * - { action: 'mark_placed' } — Mark as placed (admin checked out on Kroger)
 * - { action: 'confirm_cost', actualCost: number } — Enter actual cost from Kroger receipt
 * - { action: 'cancel' } — Cancel the order
 * - { action: 'update_markup', markupType, markupValue } — Update markup
 * - { action: 'update_address', deliveryAddress } — Update delivery address
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = createServerClient();
    if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staff = await getStaffFromAuthUser(user.id);
    if (!staff) return NextResponse.json({ error: 'Not a staff member' }, { status: 403 });

    // Verify ownership
    const { data: order } = await db
      .from('grocery_orders')
      .select('*')
      .eq('id', id)
      .eq('staff_id', staff.id)
      .single();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'add_to_cart': {
        const krogerToken = await getAdminKrogerToken(staff.id);
        if (!krogerToken) {
          return NextResponse.json({ error: 'Kroger not connected. Please connect your Kroger account first.' }, { status: 401 });
        }

        const matched = (order.kroger_matched_items as Array<{
          krogerProduct: { upc: string; size?: string; productId?: string } | null;
          groceryItem: { qty: number; unit?: string };
        }>).filter(m => m.krogerProduct);

        if (matched.length === 0) {
          return NextResponse.json({ error: 'No matched products to add' }, { status: 400 });
        }

        // Client can send { qtyOverrides: { productId: qty } } to manually adjust
        const qtyOverrides: Record<string, number> = body.qtyOverrides || {};

        const items = matched.map(m => {
          const overrideKey = m.krogerProduct!.productId || m.krogerProduct!.upc;
          const overrideQty = qtyOverrides[overrideKey];
          return {
            upc: m.krogerProduct!.upc,
            quantity: typeof overrideQty === 'number' && overrideQty > 0
              ? overrideQty
              : calculateCartQuantity(
                  m.groceryItem.qty,
                  m.groceryItem.unit || 'serving',
                  m.krogerProduct!.size || ''
                ),
          };
        });

        console.log('[Kroger Cart] Items to add:', items.map((item, i) => ({
          ...item,
          grocery: `${matched[i].groceryItem.qty} ${matched[i].groceryItem.unit || '?'}`,
          productSize: matched[i].krogerProduct!.size || '?',
        })));

        await krogerPut('/cart/add', krogerToken, { items });

        const { data: updated, error: updateErr } = await db
          .from('grocery_orders')
          .update({ status: 'in_cart' })
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ order: updated, addedCount: items.length });
      }

      case 'mark_placed': {
        const { data: updated, error: updateErr } = await db
          .from('grocery_orders')
          .update({ status: 'placed', placed_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ order: updated });
      }

      case 'confirm_cost': {
        const { actualCost } = body;
        if (typeof actualCost !== 'number' || actualCost < 0) {
          return NextResponse.json({ error: 'Valid actualCost required' }, { status: 400 });
        }

        const markupType = order.markup_type;
        const markupValue = parseFloat(order.markup_value);
        let totalCharged: number;

        if (markupType === 'percentage') {
          totalCharged = actualCost * (1 + markupValue / 100);
        } else {
          totalCharged = actualCost + markupValue;
        }
        totalCharged = Math.round(totalCharged * 100) / 100;

        const { data: updated, error: updateErr } = await db
          .from('grocery_orders')
          .update({
            actual_cost: actualCost,
            total_charged: totalCharged,
            status: 'cost_confirmed',
            cost_confirmed_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ order: updated });
      }

      case 'update_markup': {
        const { markupType, markupValue } = body;
        const updates: Record<string, unknown> = {};
        if (markupType) updates.markup_type = markupType;
        if (markupValue !== undefined) updates.markup_value = markupValue;

        // Recalculate total if cost was already confirmed
        if (order.actual_cost) {
          const mt = markupType || order.markup_type;
          const mv = markupValue ?? parseFloat(order.markup_value);
          const cost = parseFloat(order.actual_cost);
          updates.total_charged = mt === 'percentage'
            ? Math.round(cost * (1 + mv / 100) * 100) / 100
            : Math.round((cost + mv) * 100) / 100;
        }

        const { data: updated, error: updateErr } = await db
          .from('grocery_orders')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ order: updated });
      }

      case 'update_address': {
        const { deliveryAddress } = body;
        const { data: updated, error: updateErr } = await db
          .from('grocery_orders')
          .update({ delivery_address: deliveryAddress })
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ order: updated });
      }

      case 'cancel': {
        const { data: updated, error: updateErr } = await db
          .from('grocery_orders')
          .update({ status: 'cancelled' })
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        return NextResponse.json({ order: updated });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[Grocery Order PATCH]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update order' },
      { status: 500 }
    );
  }
}
