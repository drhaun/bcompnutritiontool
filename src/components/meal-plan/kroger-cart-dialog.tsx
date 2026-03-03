'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, MapPin, ShoppingCart, Check, ExternalLink,
  AlertCircle, Store, LogIn, DollarSign, Send, Package,
  Minus, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/auth-provider';

interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  category: string;
}

interface KrogerStore {
  locationId: string;
  name: string;
  chain: string;
  address: string;
  phone: string;
}

interface MatchedProduct {
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
}

type Step = 'loading' | 'connect' | 'store' | 'review' | 'adding' | 'placed' | 'cost' | 'invoiced';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groceryItems: GroceryItem[];
  clientId?: string;
  clientName?: string;
}

function krogerProductUrl(upc: string, description: string): string {
  const slug = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `https://www.kroger.com/p/${slug}/${upc}`;
}

export function KrogerCartDialog({ open, onOpenChange, groceryItems, clientId, clientName }: Props) {
  const { session } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const initDoneRef = useRef(false);

  const [zip, setZip] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('kroger_zip') || '';
    return '';
  });
  const [stores, setStores] = useState<KrogerStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<KrogerStore | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kroger_store');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [loadingStores, setLoadingStores] = useState(false);

  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [actualCost, setActualCost] = useState('');
  const [confirmingCost, setConfirmingCost] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const [totalCharged, setTotalCharged] = useState<number | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const getAuthHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  }), [session?.access_token]);

  // Only check auth + reset state when dialog first opens
  useEffect(() => {
    if (!open) {
      initDoneRef.current = false;
      return;
    }
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    setError('');
    setOrderId(null);
    setPaymentLinkUrl(null);
    setTotalCharged(null);
    setActualCost('');
    setStep('loading');
    setCheckingAuth(true);

    (async () => {
      try {
        const res = await fetch('/api/kroger/admin/status', { headers: getAuthHeaders() });
        const data = await res.json();
        const isConnected = data.connected === true;
        if (isConnected) {
          if (selectedStore) {
            setStep('review');
            setMatchedProducts([]);
          } else {
            setStep('store');
          }
        } else {
          setStep('connect');
        }
      } catch {
        setStep('connect');
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [open, getAuthHeaders, selectedStore]);

  // Auto-search when we land on the review step with no results
  useEffect(() => {
    if (step === 'review' && matchedProducts.length === 0 && !searching && groceryItems.length > 0) {
      searchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleConnect = async () => {
    setError('');
    try {
      const res = await fetch('/api/kroger/admin/connect', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Kroger sign-in');
    }
  };

  const searchStores = async () => {
    if (!zip || zip.length !== 5) return;
    setLoadingStores(true);
    setError('');
    try {
      const res = await fetch(`/api/kroger/locations?zip=${zip}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStores(data.stores || []);
      localStorage.setItem('kroger_zip', zip);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find stores');
    }
    setLoadingStores(false);
  };

  const selectStore = (store: KrogerStore) => {
    setSelectedStore(store);
    localStorage.setItem('kroger_store', JSON.stringify(store));
    setMatchedProducts([]);
    setStep('review');
  };

  const searchProducts = async () => {
    setSearching(true);
    setError('');
    try {
      const res = await fetch('/api/kroger/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: groceryItems,
          locationId: selectedStore?.locationId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const results: MatchedProduct[] = data.results || [];
      setMatchedProducts(results);
      const matched = new Set<string>();
      results.forEach(r => {
        if (r.krogerProduct && r.confidence >= 0.3) {
          matched.add(r.krogerProduct.productId);
        }
      });
      setSelectedProducts(matched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product search failed');
    }
    setSearching(false);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleAddToCart = async () => {
    const selected = matchedProducts.filter(
      m => m.krogerProduct && selectedProducts.has(m.krogerProduct.productId)
    );
    if (selected.length === 0) return;
    setAddingToCart(true);
    setStep('adding');
    setError('');

    try {
      const headers = getAuthHeaders();

      const createRes = await fetch('/api/grocery-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clientId,
          groceryItems,
          krogerMatchedItems: selected.map(m => ({
            groceryItem: m.groceryItem,
            krogerProduct: m.krogerProduct,
            confidence: m.confidence,
          })),
          estimatedCost: estimatedTotal,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);
      setOrderId(createData.order.id);

      const cartRes = await fetch(`/api/grocery-orders/${createData.order.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'add_to_cart', qtyOverrides }),
      });
      const cartData = await cartRes.json();
      if (!cartRes.ok) throw new Error(cartData.error);

      toast.success(`${cartData.addedCount} items added to your Kroger cart!`);
      setStep('placed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      setStep('review');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleMarkPlaced = async () => {
    if (!orderId) return;
    try {
      await fetch(`/api/grocery-orders/${orderId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'mark_placed' }),
      });
      setStep('cost');
    } catch {
      setError('Failed to update order');
    }
  };

  const handleConfirmCost = async () => {
    if (!orderId || !actualCost) return;
    setConfirmingCost(true);
    setError('');
    try {
      const res = await fetch(`/api/grocery-orders/${orderId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'confirm_cost', actualCost: parseFloat(actualCost) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTotalCharged(data.order.total_charged);
      toast.success(`Cost confirmed. Client will be charged $${data.order.total_charged}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm cost');
    }
    setConfirmingCost(false);
  };

  const handleSendInvoice = async () => {
    if (!orderId) return;
    setInvoicing(true);
    setError('');
    try {
      const res = await fetch(`/api/grocery-orders/${orderId}/invoice`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentLinkUrl(data.paymentLink.url);
      setStep('invoiced');
      toast.success(`Payment link created for ${data.clientName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    }
    setInvoicing(false);
  };

  const calcPkgQty = (groceryQty: number, groceryUnit: string, productSize: string): number => {
    const MAX = 3;
    const WG: Record<string, number> = {
      g:1, gram:1, grams:1, kg:1000, kilogram:1000, kilograms:1000,
      oz:28.35, ounce:28.35, ounces:28.35,
      lb:453.6, lbs:453.6, pound:453.6, pounds:453.6,
    };
    const VM: Record<string, number> = {
      ml:1, l:1000, cup:240, cups:240, tbsp:15, tsp:5,
      'fl oz':29.57, 'fl. oz':29.57, gal:3785, qt:946, pt:473,
    };
    const flOzUnits = new Set(['fl oz','fl. oz','fl oz.','fluid ounce','fluid ounces']);

    // Parse product total size (handles multi-packs)
    let pAmt = 0, pUnit = '';
    const segs = productSize.split('/').map(s => s.trim());
    if (segs.length >= 2) {
      const f = segs[0].match(/^([\d.]+)\s*(.*)/);
      const s = segs[1].match(/^([\d.]+)\s*(.*)/);
      if (f && s) {
        const cU = f[2].toLowerCase().trim();
        const pV = parseFloat(s[1]);
        const pU2 = s[2].toLowerCase().trim();
        const isCount = ['bottles','bottle','cans','can','bags','bag','packs','pack','pk','pc','pcs','ct','count','pieces'].includes(cU);
        if (isCount && (WG[pU2] !== undefined || VM[pU2] !== undefined)) {
          pAmt = parseFloat(f[1]) * pV;
          pUnit = pU2;
        } else if (WG[pU2] !== undefined || VM[pU2] !== undefined) {
          pAmt = pV;
          pUnit = pU2;
        }
      }
    }
    if (!pAmt) {
      const m = productSize.match(/^([\d.]+)\s*(.*)/);
      if (m) { pAmt = parseFloat(m[1]); pUnit = m[2].toLowerCase().trim(); }
    }
    if (!pAmt || pAmt <= 0) return 1;

    const gu = groceryUnit.toLowerCase().replace(/\.$/, '');
    const gW = WG[gu] ?? (flOzUnits.has(gu) ? 28.35 : null);
    const pW = WG[pUnit] ?? (flOzUnits.has(pUnit) ? 28.35 : null);
    if (gW !== null && pW !== null) {
      return Math.max(1, Math.min(MAX, Math.ceil((groceryQty * gW) / (pAmt * pW))));
    }
    const gV = VM[gu] ?? (gu === 'oz' || gu === 'ounce' || gu === 'ounces' ? 29.57 : null);
    const pV = VM[pUnit] ?? (pUnit === 'oz' || pUnit === 'ounce' || pUnit === 'ounces' ? 29.57 : null);
    if (gV !== null && pV !== null) {
      return Math.max(1, Math.min(MAX, Math.ceil((groceryQty * gV) / (pAmt * pV))));
    }
    if (gu === pUnit && pAmt > 0) {
      return Math.max(1, Math.min(MAX, Math.ceil(groceryQty / pAmt)));
    }
    return 1;
  };

  const matchedCount = matchedProducts.filter(
    m => m.krogerProduct && selectedProducts.has(m.krogerProduct.productId)
  ).length;
  const unmatchedCount = matchedProducts.filter(m => !m.krogerProduct).length;
  const estimatedTotal = matchedProducts
    .filter(m => m.krogerProduct && selectedProducts.has(m.krogerProduct.productId) && m.krogerProduct.price)
    .reduce((sum, m) => {
      const autoQty = calcPkgQty(m.groceryItem.qty, m.groceryItem.unit, m.krogerProduct!.size);
      const qty = qtyOverrides[m.krogerProduct!.productId] ?? autoQty;
      return sum + (m.krogerProduct!.price || 0) * qty;
    }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            {step === 'loading' && 'Kroger Cart'}
            {step === 'connect' && 'Connect Kroger'}
            {step === 'store' && 'Select Store'}
            {step === 'review' && `Order for ${clientName || 'Client'}`}
            {step === 'adding' && 'Adding to Cart...'}
            {step === 'placed' && 'Checkout on Kroger'}
            {step === 'cost' && 'Enter Actual Cost'}
            {step === 'invoiced' && 'Invoice Sent'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Checking Kroger connection...</p>
            </div>
          )}

          {/* Connect */}
          {step === 'connect' && (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
                <p className="font-medium">Connect your Kroger account</p>
                <p className="text-sm text-muted-foreground">
                  Go to <strong>Admin &rarr; Kroger Integration</strong> to connect first, or connect now.
                </p>
                <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700">
                  <LogIn className="h-4 w-4 mr-2" /> Connect Kroger
                </Button>
              </div>
            </div>
          )}

          {/* Store Selection */}
          {step === 'store' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a store for pricing and availability.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Zip code"
                  value={zip}
                  onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-32"
                  onKeyDown={e => e.key === 'Enter' && searchStores()}
                />
                <Button onClick={searchStores} disabled={loadingStores || zip.length !== 5} variant="outline">
                  {loadingStores ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
                  Find Stores
                </Button>
              </div>
              {stores.length > 0 && (
                <div className="space-y-2">
                  {stores.map(store => (
                    <div
                      key={store.locationId}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                        selectedStore?.locationId === store.locationId ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => selectStore(store)}
                    >
                      <div>
                        <p className="font-medium text-sm">{store.name}</p>
                        <p className="text-xs text-muted-foreground">{store.address}</p>
                      </div>
                      {selectedStore?.locationId === store.locationId && (
                        <Check className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Review & Add to Cart */}
          {step === 'review' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {selectedStore && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" /> {selectedStore.name}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setStep('store')}>
                  Change store
                </Button>
              </div>

              {searching ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="text-sm text-muted-foreground">Matching {groceryItems.length} items...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{matchedCount} selected</span>
                      {unmatchedCount > 0 && (
                        <span className="text-orange-600 text-xs">{unmatchedCount} not found</span>
                      )}
                    </div>
                    {estimatedTotal > 0 && (
                      <span className="font-medium">Est. ${estimatedTotal.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {matchedProducts.map((match, idx) => {
                      const product = match.krogerProduct;
                      const isSelected = product ? selectedProducts.has(product.productId) : false;
                      const autoQty = product
                        ? calcPkgQty(match.groceryItem.qty, match.groceryItem.unit, product.size)
                        : 1;
                      const effectiveQty = product && qtyOverrides[product.productId] !== undefined
                        ? qtyOverrides[product.productId]
                        : autoQty;
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 p-2 border rounded-lg transition-colors ${
                            !product ? 'opacity-50 bg-muted/30' : isSelected ? 'border-blue-200 bg-blue-50/30' : ''
                          }`}
                        >
                          {product ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProduct(product.productId)}
                              className="mt-1"
                            />
                          ) : (
                            <div className="w-4 h-4 mt-1" />
                          )}
                          {product?.imageUrl ? (
                            <img src={product.imageUrl} alt={product.description} className="w-10 h-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">
                              {match.groceryItem.qty} {match.groceryItem.unit} {match.groceryItem.name}
                            </p>
                            {product ? (
                              <>
                                <a
                                  href={krogerProductUrl(product.upc, product.description)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium truncate block text-blue-700 hover:underline"
                                >
                                  {product.description}
                                </a>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{product.size}</span>
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      className="w-5 h-5 rounded border flex items-center justify-center hover:bg-muted text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (effectiveQty > 1) setQtyOverrides(prev => ({ ...prev, [product.productId]: effectiveQty - 1 }));
                                      }}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="text-xs font-medium w-5 text-center">{effectiveQty}</span>
                                    <button
                                      className="w-5 h-5 rounded border flex items-center justify-center hover:bg-muted text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setQtyOverrides(prev => ({ ...prev, [product.productId]: effectiveQty + 1 }));
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-red-500">No match</span>
                            )}
                          </div>
                          {product?.price && (
                            <span className="text-sm font-medium shrink-0">
                              ${(product.price * effectiveQty).toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs">Delivery notes (optional)</Label>
                    <Textarea
                      value={deliveryNotes}
                      onChange={e => setDeliveryNotes(e.target.value)}
                      placeholder="Client address, delivery instructions..."
                      className="h-16 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Adding (loading) */}
          {step === 'adding' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="font-medium">Adding items to your Kroger cart...</p>
            </div>
          )}

          {/* Placed — go check out on Kroger */}
          {step === 'placed' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Items added to your Kroger cart!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to Kroger to review, set delivery for <strong>{clientName || 'the client'}</strong>, and check out.
                </p>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
                <a href="https://www.kroger.com/cart" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Go to Kroger Cart
                </a>
              </Button>
              <Button variant="outline" className="w-full" onClick={handleMarkPlaced}>
                <Package className="h-4 w-4 mr-2" /> I&apos;ve checked out — enter actual cost
              </Button>
            </div>
          )}

          {/* Enter Actual Cost */}
          {step === 'cost' && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Enter the total from your Kroger receipt. The client will be billed this plus your markup.
              </p>
              <div className="space-y-2">
                <Label>Kroger Receipt Total ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCost}
                  onChange={e => setActualCost(e.target.value)}
                  placeholder="e.g., 87.42"
                />
              </div>
              {totalCharged !== null && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Client will be charged: ${totalCharged.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grocery cost: ${parseFloat(actualCost).toFixed(2)} + markup
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Invoice Sent */}
          {step === 'invoiced' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Payment link created!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share with <strong>{clientName || 'the client'}</strong> to collect payment.
                </p>
                {totalCharged && (
                  <p className="text-lg font-bold mt-2">${totalCharged.toFixed(2)}</p>
                )}
              </div>
              {paymentLinkUrl && (
                <div className="bg-muted/50 border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Input value={paymentLinkUrl} readOnly className="text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentLinkUrl);
                        toast.success('Payment link copied!');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed footer buttons */}
        {step === 'review' && !searching && matchedProducts.length > 0 && (
          <DialogFooter className="shrink-0 pt-3 border-t">
            <Button
              onClick={handleAddToCart}
              disabled={addingToCart || matchedCount === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {addingToCart ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding to cart...</>
              ) : (
                <><ShoppingCart className="h-4 w-4 mr-2" /> Add {matchedCount} Items to My Kroger Cart</>
              )}
            </Button>
          </DialogFooter>
        )}

        {step === 'cost' && (
          <DialogFooter className="shrink-0 pt-3 border-t">
            {totalCharged === null ? (
              <Button
                onClick={handleConfirmCost}
                disabled={confirmingCost || !actualCost}
                className="w-full"
              >
                {confirmingCost ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                Confirm Cost
              </Button>
            ) : (
              <Button
                onClick={handleSendInvoice}
                disabled={invoicing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {invoicing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send Payment Link to {clientName || 'Client'}
              </Button>
            )}
          </DialogFooter>
        )}

        {step === 'invoiced' && (
          <DialogFooter className="shrink-0 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
