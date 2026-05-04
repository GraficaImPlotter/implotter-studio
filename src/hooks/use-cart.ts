import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import { generateUUID } from "@/lib/uuid";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  instructions?: string;
  // Per-sqm fields
  pricingType?: "fixed" | "per_sqm";
  saleUnit?: "unit" | "pack" | "sqm";
  pricePerSqm?: number;
  itemWidth?: number;
  itemHeight?: number;
  itemArea?: number;
  // Finishing fields
  finishings?: string[];
  finishingsTotal?: number;
  // Shipping dimensions
  shippingWeight?: number;
  shippingHeight?: number;
  shippingWidth?: number;
  shippingLength?: number;
}

export type DiscountSource = "coupon" | "progressive" | null;

interface CartState {
  items: CartItem[];

  // Coupon
  couponCode: string | null;
  couponId: string | null;
  freeShipping: boolean;

  // Applied discount (either coupon OR progressive)
  discount: number;
  discountSource: DiscountSource;
  progressiveRuleName: string | null;

  affiliateCode: string | null;

  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  setCoupon: (payload: { code: string; id: string; discount: number; freeShipping: boolean }) => void;
  clearCoupon: () => void;
  setProgressiveDiscount: (payload: { discount: number; ruleName: string | null }) => void;

  setAffiliateCode: (code: string | null) => void;

  shippingOption: any | null;
  setShippingOption: (opt: any | null) => void;

  getSubtotal: () => number;
  getTotal: () => number;

  // Cloud sync
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
}

// Debounced cloud save
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSync = (fn: () => Promise<void>) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => fn(), 1500);
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      couponCode: null,
      couponId: null,
      freeShipping: false,

      discount: 0,
      discountSource: null,
      progressiveRuleName: null,

      affiliateCode: null,
      shippingOption: null,

      addItem: (item) => {
        const items = get().items;
        // For per_sqm items, always add as new line (dimensions may differ)
        if (item.pricingType === "per_sqm") {
          set({ items: [...items, { ...item, id: generateUUID() }] });
          debouncedSync(() => get().syncToCloud());
          return;
        }
        const existing = items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i,
            ),
          });
        } else {
          set({ items: [...items, { ...item, id: generateUUID() }] });
        }
        debouncedSync(() => get().syncToCloud());
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
        debouncedSync(() => get().syncToCloud());
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
        } else {
          set({ items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)) });
        }
        debouncedSync(() => get().syncToCloud());
      },

      clearCart: () => {
        set({
          items: [],
          couponCode: null,
          couponId: null,
          freeShipping: false,
          discount: 0,
          discountSource: null,
          progressiveRuleName: null,
          shippingOption: null,
        });
        debouncedSync(() => get().syncToCloud());
      },

      setCoupon: ({ code, id, discount, freeShipping }) =>
        set({
          couponCode: code,
          couponId: id,
          freeShipping,
          discount,
          discountSource: "coupon",
          progressiveRuleName: null,
        }),

      clearCoupon: () =>
        set({
          couponCode: null,
          couponId: null,
          freeShipping: false,
          discount: 0,
          discountSource: null,
          progressiveRuleName: null,
        }),

      setProgressiveDiscount: ({ discount, ruleName }) => {
        // Don't override a coupon
        if (get().couponCode) return;
        set({ discount, discountSource: discount > 0 ? "progressive" : null, progressiveRuleName: ruleName });
      },

      setAffiliateCode: (code) => set({ affiliateCode: code }),
      setShippingOption: (opt) => set({ shippingOption: opt }),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getTotal: () => {
        const subtotal = get().getSubtotal();
        return Math.max(0, subtotal - (get().discount || 0));
      },

      syncToCloud: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const cartData = get().items;
          await supabase.from("saved_carts").upsert(
            { user_id: user.id, cart_data: cartData as any, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        } catch {
          // silent fail - local cart still works
        }
      },

      loadFromCloud: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase
            .from("saved_carts")
            .select("cart_data")
            .eq("user_id", user.id)
            .maybeSingle();
          if (data?.cart_data && Array.isArray(data.cart_data)) {
            const localItems = get().items;
            // If local cart is empty, load from cloud
            if (localItems.length === 0 && (data.cart_data as any[]).length > 0) {
              set({ items: data.cart_data as unknown as CartItem[] });
            }
          }
        } catch {
          // silent fail
        }
      },
    }),
    { name: "implotter-cart" },
  ),
);
