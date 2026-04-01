import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api-auth';
import {
  createInstacartShoppingList,
  isInstacartConfigured,
} from '@/lib/instacart-client';
import type { GroceryLineItem } from '@/lib/instacart-client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireStaffSession();

    if (!isInstacartConfigured()) {
      return NextResponse.json(
        { error: 'Instacart API key not configured' },
        { status: 503 },
      );
    }

    const body = await request.json();
    const items: GroceryLineItem[] = body.items;
    const title: string | undefined = body.title;
    const instructions: string[] | undefined = body.instructions;
    const linkbackUrl: string | undefined = body.linkbackUrl;
    const healthFilters: string[] | undefined = body.healthFilters;
    const retailerKey: string | undefined = body.retailerKey;

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const url = await createInstacartShoppingList({
      items,
      title,
      linkbackUrl,
      instructions,
      healthFilters,
      retailerKey,
    });

    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Instacart Shopping List]', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to create shopping list',
      },
      { status: 500 },
    );
  }
}
