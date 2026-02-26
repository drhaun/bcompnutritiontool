import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

// GET: List products, prices, and/or promo codes
export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

    const type = request.nextUrl.searchParams.get('type') || 'products';

    if (type === 'products') {
      const products = await stripe.products.list({ active: true, limit: 50, expand: ['data.default_price'] });
      const items = products.data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
        defaultPriceId: typeof p.default_price === 'object' ? p.default_price?.id : p.default_price,
        defaultPriceAmount: typeof p.default_price === 'object' && p.default_price ? (p.default_price as Stripe.Price).unit_amount : null,
        defaultPriceCurrency: typeof p.default_price === 'object' && p.default_price ? (p.default_price as Stripe.Price).currency : null,
      }));
      return NextResponse.json({ products: items });
    }

    if (type === 'prices') {
      const productId = request.nextUrl.searchParams.get('product_id');
      const params: Stripe.PriceListParams = { active: true, limit: 50 };
      if (productId) params.product = productId;
      const prices = await stripe.prices.list(params);
      const items = prices.data.map(p => ({
        id: p.id,
        productId: typeof p.product === 'string' ? p.product : p.product?.toString(),
        unitAmount: p.unit_amount,
        currency: p.currency,
        type: p.type,
        recurring: p.recurring ? { interval: p.recurring.interval, intervalCount: p.recurring.interval_count } : null,
        active: p.active,
        nickname: p.nickname,
      }));
      return NextResponse.json({ prices: items });
    }

    if (type === 'coupons') {
      const coupons = await stripe.coupons.list({ limit: 50 });
      const items = coupons.data.map(c => ({
        id: c.id,
        name: c.name,
        percentOff: c.percent_off,
        amountOff: c.amount_off,
        currency: c.currency,
        duration: c.duration,
        durationInMonths: c.duration_in_months,
        valid: c.valid,
        timesRedeemed: c.times_redeemed,
        maxRedemptions: c.max_redemptions,
      }));
      return NextResponse.json({ coupons: items });
    }

    if (type === 'promo_codes') {
      const promos = await stripe.promotionCodes.list({ active: true, limit: 50 });
      const items = promos.data.map((p: Record<string, unknown>) => {
        const promotion = p.promotion as Record<string, unknown> | undefined;
        const coupon = (promotion?.coupon || p.coupon) as Record<string, unknown> | string | undefined;
        const couponObj = typeof coupon === 'object' && coupon ? coupon : null;
        return {
          id: p.id,
          code: p.code,
          active: p.active,
          couponId: couponObj ? couponObj.id : (typeof coupon === 'string' ? coupon : null),
          couponName: couponObj?.name ?? null,
          percentOff: couponObj?.percent_off ?? null,
          amountOff: couponObj?.amount_off ?? null,
          timesRedeemed: p.times_redeemed,
          maxRedemptions: p.max_redemptions,
          expiresAt: p.expires_at,
        };
      });
      return NextResponse.json({ promoCodes: items });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    console.error('[Stripe API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch Stripe data' }, { status: 500 });
  }
}

// POST: Create product, price, coupon, or promo code
export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

    const body = await request.json();
    const { action } = body;

    if (action === 'create_product') {
      const product = await stripe.products.create({
        name: body.name,
        description: body.description || undefined,
      });

      let price: Stripe.Price | null = null;
      if (body.priceAmount) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(body.priceAmount * 100),
          currency: body.currency || 'usd',
          ...(body.recurring ? {
            recurring: {
              interval: body.recurringInterval || 'month',
              interval_count: body.recurringIntervalCount || 1,
            },
          } : {}),
        });
        await stripe.products.update(product.id, { default_price: price.id });
      }

      return NextResponse.json({
        product: { id: product.id, name: product.name },
        price: price ? { id: price.id, unitAmount: price.unit_amount } : null,
      }, { status: 201 });
    }

    if (action === 'create_price') {
      const price = await stripe.prices.create({
        product: body.productId,
        unit_amount: Math.round(body.amount * 100),
        currency: body.currency || 'usd',
        nickname: body.nickname || undefined,
        ...(body.recurring ? {
          recurring: {
            interval: body.recurringInterval || 'month',
            interval_count: body.recurringIntervalCount || 1,
          },
        } : {}),
      });
      return NextResponse.json({ price: { id: price.id, unitAmount: price.unit_amount } }, { status: 201 });
    }

    if (action === 'create_coupon') {
      const params: Stripe.CouponCreateParams = {
        name: body.name,
        duration: body.duration || 'once',
      };
      if (body.percentOff) params.percent_off = body.percentOff;
      else if (body.amountOff) {
        params.amount_off = Math.round(body.amountOff * 100);
        params.currency = body.currency || 'usd';
      }
      if (body.maxRedemptions) params.max_redemptions = body.maxRedemptions;
      if (body.durationInMonths) params.duration_in_months = body.durationInMonths;

      const coupon = await stripe.coupons.create(params);
      return NextResponse.json({ coupon: { id: coupon.id, name: coupon.name } }, { status: 201 });
    }

    if (action === 'create_promo_code') {
      const params: Record<string, unknown> = {
        promotion: { type: 'coupon', coupon: body.couponId },
        code: body.code,
      };
      if (body.maxRedemptions) params.max_redemptions = body.maxRedemptions;
      if (body.expiresAt) params.expires_at = Math.floor(new Date(body.expiresAt).getTime() / 1000);

      const promo = await stripe.promotionCodes.create(params as Stripe.PromotionCodeCreateParams);
      return NextResponse.json({ promoCode: { id: promo.id, code: promo.code } }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[Stripe API] POST error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
